-- Hi!Book 2.0 — profile visibility RLS fix
-- The profile policy must use the SECURITY DEFINER visibility helper because
-- user_privacy_settings intentionally exposes rows only to their owner.
-- A direct EXISTS against user_privacy_settings therefore hides every other
-- user's public profile from authenticated clients.

begin;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (
  public.can_view_profile(user_id)
  or public.is_admin_permission('users.view')
);

commit;
