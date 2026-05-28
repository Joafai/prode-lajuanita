-- Extends stage_winners to support a full top-3 podium per stage instead of
-- just the #1. The previous schema had `stage_key` as primary key (one row per
-- stage). Now the PK is composite (stage_key, user_id) so multiple users can
-- share a stage — including ties at the same position (per the dense-rank
-- leaderboard rule, two players tied at the top both get position 1).
--
-- Why this matters: the group-stage and knockout-stage prizes have first,
-- second and third-place rewards (see /how-to-play and the podium images in
-- /public). The phaseCloseEmail blast and the /tabla winners banner both want
-- the whole podium, not just the leader. Ties on the podium share the prize.

alter table public.stage_winners
  add column if not exists position smallint;

-- Backfill any existing single-row winners to position 1
update public.stage_winners
set position = 1
where position is null;

alter table public.stage_winners
  alter column position set not null;

-- Drop the old single-row primary key and replace with (stage_key, user_id).
-- (stage_key, user_id) is unique per record but allows multiple users at the
-- same `position` (ties), which (stage_key, position) wouldn't.
alter table public.stage_winners
  drop constraint if exists stage_winners_pkey;

alter table public.stage_winners
  add primary key (stage_key, user_id);

create index if not exists stage_winners_stage_position_idx
  on public.stage_winners (stage_key, position);
