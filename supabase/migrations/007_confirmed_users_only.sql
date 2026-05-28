-- Adds a `confirmed_at` column on profiles that mirrors auth.users.email_confirmed_at,
-- so any query against `profiles` can filter unconfirmed users without joining
-- across schemas. Keeps it in sync with a trigger on auth.users updates.
--
-- After this migration:
--   • get_leaderboard returns only confirmed non-admin users.
--   • Application-level email blasts (phase_open, phase_close) filter on
--     confirmed_at IS NOT NULL.
--   • Profile rows still exist for unconfirmed users (so they can confirm later
--     and become eligible), they're just invisible to the prode lifecycle.

alter table public.profiles
  add column if not exists confirmed_at timestamptz;

-- Backfill from existing auth.users data
update public.profiles p
set confirmed_at = u.email_confirmed_at
from auth.users u
where u.id = p.id
  and (p.confirmed_at is null or p.confirmed_at <> u.email_confirmed_at);

-- Trigger: keep profiles.confirmed_at in sync when auth.users.email_confirmed_at changes
create or replace function public.sync_profile_confirmed_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set confirmed_at = new.email_confirmed_at
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (new.email_confirmed_at is distinct from old.email_confirmed_at)
  execute procedure public.sync_profile_confirmed_at();

-- Also handle the rare case where a user is created already-confirmed
-- (e.g. admin manually marks them confirmed). The handle_new_user trigger
-- already inserts the profile row; this just makes sure confirmed_at is set
-- correctly on that initial insert if the user happens to be confirmed already.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, confirmed_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email_confirmed_at
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Re-create get_leaderboard with the new confirmed-only + non-admin filter
create or replace function public.get_leaderboard()
returns table (
  user_id      uuid,
  name         text,
  email        text,
  total_pts    bigint,
  exact_count  bigint,
  winner_count bigint,
  picks_count  bigint
)
language sql security definer set search_path = public as $$
  select
    p.id,
    p.name,
    p.email,
    coalesce(sum(
      case
        when m.home_score is null then 0
        when pk.home_score = m.home_score and pk.away_score = m.away_score then 3
        when sign(pk.home_score - pk.away_score) = sign(m.home_score - m.away_score) then 1
        else 0
      end
    ), 0) as total_pts,
    coalesce(sum(
      case when m.home_score is not null
            and pk.home_score = m.home_score
            and pk.away_score = m.away_score then 1 else 0 end
    ), 0) as exact_count,
    coalesce(sum(
      case when m.home_score is not null
            and sign(pk.home_score - pk.away_score) = sign(m.home_score - m.away_score)
            and not (pk.home_score = m.home_score and pk.away_score = m.away_score)
       then 1 else 0 end
    ), 0) as winner_count,
    count(pk.match_id) as picks_count
  from public.profiles p
  left join public.picks pk on pk.user_id = p.id
  left join public.matches m on m.id = pk.match_id
  where coalesce(p.is_admin, false) = false
    and p.confirmed_at is not null
  group by p.id, p.name, p.email
  order by total_pts desc, lower(p.name) asc;
$$;
