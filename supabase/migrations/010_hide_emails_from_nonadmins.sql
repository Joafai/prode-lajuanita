-- Hides participant emails from non-admin callers of get_leaderboard.
--
-- Background: the RPC is `security definer` (runs with elevated privileges)
-- and returns the full leaderboard including each row's email. Any logged-in
-- user could call `supabase.rpc('get_leaderboard')` from the browser console
-- and harvest every participant's email — a PII / phishing risk.
--
-- Fix: keep the same row shape so the existing frontend code keeps compiling,
-- but return NULL for the `email` column unless the caller is an admin. The
-- /api/notify route runs server-side with elevated context for the admin path
-- and still gets real emails; admin pages get emails too.

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
  with caller_is_admin as (
    select coalesce(
      (select is_admin from public.profiles where id = auth.uid()),
      false
    ) as ok
  )
  select
    p.id,
    p.name,
    case when (select ok from caller_is_admin) then p.email else null end as email,
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
  order by total_pts desc, exact_count desc, lower(p.name) asc;
$$;

notify pgrst, 'reload schema';
