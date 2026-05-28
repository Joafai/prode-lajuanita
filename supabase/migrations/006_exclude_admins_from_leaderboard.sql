-- Re-creates get_leaderboard with an explicit filter that excludes admin
-- profiles. Admins run the prode (set scores, trigger notifications) and
-- should not appear as competitors in the leaderboard, stage_winners snapshots
-- or any tournament_end / winner email blast that derives from the leaderboard.

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
  group by p.id, p.name, p.email
  order by total_pts desc, lower(p.name) asc;
$$;
