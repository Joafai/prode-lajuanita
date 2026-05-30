-- Re-applies get_leaderboard with `exact_count` as the secondary sort key.
--
-- Rule change: ties on total_pts are now broken by who has more exact-score
-- predictions. This also means tied points → DIFFERENT positions (the player
-- with more exacts ranks higher), reversing the prior "shared position on tie"
-- rule introduced in migration 005. The tertiary tiebreaker (alphabetical) is
-- kept only as a stable display fallback when both pts AND exacts are equal.

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
  order by total_pts desc, exact_count desc, lower(p.name) asc;
$$;
