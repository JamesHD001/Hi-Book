-- Hi!Book 2.0 — Social graph read helpers
-- Exposes only the minimum aggregate follow state needed by the client UI.

begin;

create or replace function public.get_follow_stats(target_user_id uuid)
returns table (
  followers_count bigint,
  following_count bigint,
  is_following boolean,
  is_followed_by boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.follows f where f.following_id = target_user_id),
    (select count(*) from public.follows f where f.follower_id = target_user_id),
    exists (
      select 1
      from public.follows f
      where f.follower_id = (select auth.uid())
        and f.following_id = target_user_id
    ),
    exists (
      select 1
      from public.follows f
      where f.follower_id = target_user_id
        and f.following_id = (select auth.uid())
    )
  from public.users u
  where u.id = target_user_id
    and u.account_status = 'ACTIVE'
    and public.can_view_profile(target_user_id)
    and not exists (
      select 1
      from public.blocks b
      where (b.blocker_id = (select auth.uid()) and b.blocked_id = target_user_id)
         or (b.blocker_id = target_user_id and b.blocked_id = (select auth.uid()))
    );
$$;

revoke execute on function public.get_follow_stats(uuid) from public;
revoke execute on function public.get_follow_stats(uuid) from anon;
grant execute on function public.get_follow_stats(uuid) to authenticated;

commit;
