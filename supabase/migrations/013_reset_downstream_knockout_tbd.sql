-- 013_reset_downstream_knockout_tbd.sql
--
-- One-time cleanup. An earlier run of the buggy sync (old STEP 1 in
-- app/api/sync-results/route.ts) wrote teams into knockout rounds BEYOND the
-- round of 32 — octavos, cuartos, semis, tercero, final — before those matchups
-- were actually decided. Those slots must be empty (TBD) and only get filled by
-- the sync once the previous round finishes.
--
-- This resets every still-undecided slot (home_score IS NULL) in those phases
-- back to TBD. Matches with a result loaded are left untouched, so it's safe to
-- run at any point. The round of 32 (dieciseisavos) is intentionally excluded —
-- it's in progress and its real teams are correct.
--
-- The UI treats any team name starting with "TBD" as a placeholder, so a plain
-- 'TBD' is enough; the exact numbering from 001_schema.sql doesn't matter.

update public.matches
set home_team = 'TBD', away_team = 'TBD'
where phase in ('octavos', 'cuartos', 'semis', 'tercero', 'final')
  and home_score is null;
