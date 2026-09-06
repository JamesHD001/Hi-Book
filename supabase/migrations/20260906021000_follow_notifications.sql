-- Hi!Book 2.0 — Follow notification generation
-- Notifications remain a downstream projection of the social graph.

begin;

create or replace function public.create_follow_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.follower_id = new.following_id then
    return new;
  end if;

  if exists (
    select 1
    from public.user_notification_preferences p
    where p.user_id = new.following_id
      and p.follows_enabled = false
  ) then
    return new;
  end if;

  if exists (
    select 1
    from public.blocks b
    where (b.blocker_id = new.follower_id and b.blocked_id = new.following_id)
       or (b.blocker_id = new.following_id and b.blocked_id = new.follower_id)
  ) then
    return new;
  end if;

  insert into public.notifications (
    recipient_id,
    actor_id,
    type,
    entity_type,
    entity_id
  )
  select
    new.following_id,
    new.follower_id,
    'FOLLOW'::public.notification_type,
    'USER'::public.notification_entity_type,
    new.follower_id
  where exists (
    select 1
    from public.users u
    where u.id = new.follower_id
      and u.account_status = 'ACTIVE'
  )
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.create_follow_notification() from public;
revoke all on function public.create_follow_notification() from anon;
revoke all on function public.create_follow_notification() from authenticated;

drop trigger if exists follows_create_notification on public.follows;
create trigger follows_create_notification
after insert on public.follows
for each row
execute function public.create_follow_notification();

commit;
