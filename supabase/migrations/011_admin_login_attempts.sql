-- Rate-limit table for the makeAdmin server action.
--
-- Background: makeAdmin compares a client-supplied password against the
-- ADMIN_PASSWORD env var. With no rate limiting, any authenticated user can
-- brute-force the password at HTTP speed (~req/s). This table records every
-- attempt so the action can refuse calls after N failures in a window.
--
-- Wipe-on-success: the action deletes the user's rows after a correct attempt
-- so a legitimate admin isn't penalized for early typos.

create table if not exists public.admin_login_attempts (
  user_id      uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index if not exists admin_login_attempts_user_time_idx
  on public.admin_login_attempts (user_id, attempted_at);

alter table public.admin_login_attempts enable row level security;

-- No client-facing select/insert/delete policies — the table is only touched
-- by the server action which uses the user's session (auth.uid()) via RLS.
-- We expose targeted policies so the action keeps working while denying any
-- cross-user reads.

create policy "admin_attempts_select_own" on public.admin_login_attempts
  for select using (user_id = auth.uid());

create policy "admin_attempts_insert_own" on public.admin_login_attempts
  for insert with check (user_id = auth.uid());

create policy "admin_attempts_delete_own" on public.admin_login_attempts
  for delete using (user_id = auth.uid());
