-- Hi!Book 2.0 — post like interaction RPCs
-- Likes remain an event/junction table. The client never creates notifications directly.

begin;

create or replace function public.toggle_post_like(target_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  liked boolean;
  author_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select p.user_id into author_id
  from public.posts p
  where p.id = target_post_id
    and public.can_view_post(target_post_id)
    and p.status = 'PUBLISHED';

  if author_id is null then
    raise exception 'Post is not available';
  end if;

  if exists (select 1 from public.post_likes l where l.post_id = target_post_id and l.user_id = auth.uid()) then
    delete from public.post_likes
    where post_id = target_post_id and user_id = auth.uid();
    return false;
  end if;

  insert into public.post_likes (post_id, user_id)
  values (target_post_id, auth.uid());

  if author_id <> auth.uid()
     and not public.is_blocked_between(author_id)
     and exists (select 1 from public.users u where u.id = auth.uid() and u.account_status = 'ACTIVE') then
    insert into public.notifications (recipient_id, actor_id, type, entity_type, entity_id)
    values (author_id, auth.uid(), 'POST_LIKE'::public.notification_type, 'POST'::public.notification_entity_type, target_post_id);
  end if;

  return true;
end;
$$;

create or replace function public.get_post_like_state(target_post_id uuid)
returns table(liked boolean, like_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.post_likes l
      where l.post_id = target_post_id and l.user_id = auth.uid()
    ),
    (select count(*) from public.post_likes l where l.post_id = target_post_id)
  where public.can_view_post(target_post_id);
$$;

revoke all on function public.toggle_post_like(uuid) from public;
revoke all on function public.toggle_post_like(uuid) from anon;
grant execute on function public.toggle_post_like(uuid) to authenticated;

revoke all on function public.get_post_like_state(uuid) from public;
revoke all on function public.get_post_like_state(uuid) from anon;
grant execute on function public.get_post_like_state(uuid) to authenticated;

commit;
