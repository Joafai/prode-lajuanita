-- Snapshot of who was #1 on the leaderboard the moment a prize stage ended.
-- The points the snapshot captures are frozen at that timestamp — even if
-- other participants overtake the leaderboard later in the tournament, the
-- stage winner is determined by who was on top *at that moment*.
--
-- Keys used:
--   'grupos'         → Group Stage winner
--   'pool_champion'  → Knockout-stage / Pool champion (after the final)

create table if not exists public.stage_winners (
  stage_key    text        primary key,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  name         text        not null,
  points       bigint      not null,
  declared_at  timestamptz not null default now()
);

alter table public.stage_winners enable row level security;

-- Anyone authenticated can read (the banner on /tabla shows it publicly).
create policy "stage_winners_select_all" on public.stage_winners
  for select using (true);

-- Only admins can write.
create policy "stage_winners_admin_write" on public.stage_winners
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
