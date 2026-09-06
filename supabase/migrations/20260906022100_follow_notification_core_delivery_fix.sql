-- Follow notifications are an in-app projection and must not disappear when
-- a user disables optional follow delivery channels. follows_enabled is used
-- by future push/email delivery workers, not by the core in-app stream.

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
  );

  return new;
end;
$$;

revoke all on function public.create_follow_notification() from public;
revoke all on function public.create_follow_notification() from anon;
revoke all on function public.create_follow_notification() from authenticated;

commit;
