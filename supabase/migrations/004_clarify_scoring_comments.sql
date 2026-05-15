-- Re-creates get_leaderboard() with explanatory comments so the tie-handling
-- behavior is obvious. The scoring math is UNCHANGED — this migration only
-- adds documentation. Mirrors lib/scoring.ts.
--
--   3 pts → exact score (a draw counts as exact, e.g. 1-1 vs 1-1)
--   1 pt  → correct outcome (winner OR draw) but wrong score
--           e.g. 3-3 vs 1-1: predicted a draw, real was a draw → 1 pt
--   0 pts → wrong outcome (or no result yet)

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
        -- 3 pts: exact score match (including exact draws like 1-1 vs 1-1)
        when pk.home_score = m.home_score and pk.away_score = m.away_score then 3
        -- 1 pt: same outcome but wrong score. sign() returns -1/0/+1 so this
        -- correctly groups draws (0 = 0) and wins-on-each-side together.
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
  group by p.id, p.name, p.email
  order by total_pts desc, exact_count desc, winner_count desc;
$$;
