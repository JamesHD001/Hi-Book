-- Hi!Book 2.0 — prevent anonymous execution of profile-visibility authorization RPC.

begin;

revoke execute on function public.can_view_profile(uuid) from anon;

commit;
