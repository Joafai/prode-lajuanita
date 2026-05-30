-- Adds an explicit DELETE policy on `profiles`.
--
-- Background: migration 001 enabled RLS on profiles and declared select /
-- insert / update policies but no DELETE policy. With RLS enabled and no
-- matching policy, the default is "deny" — so this isn't a privilege
-- escalation, but it's worth being explicit so a future migration that
-- accidentally relaxes RLS doesn't silently expose deletion.
--
-- Policy: only service-role (e.g. the admin client) can delete; no normal
-- authenticated user can delete any profile (including their own).

create policy "profiles_no_delete_for_users" on public.profiles
  for delete using (false);
