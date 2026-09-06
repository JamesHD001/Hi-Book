begin;

-- Enforce the locked one-level reply model and same-post parent relationship
-- regardless of whether a comment is created through the application RPC or
-- an authorized database client.
create or replace function public.validate_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_record record;
  post_record record;
begin
  select p.id, p.status into post_record
  from public.posts p
  where p.id = new.post_id;

  if not found or post_record.status <> 'PUBLISHED' then
    raise exception 'Comments require a published post';
  end if;

  if new.parent_comment_id is not null then
    select c.id, c.post_id, c.parent_comment_id, c.status
      into parent_record
    from public.comments c
    where c.id = new.parent_comment_id;

    if not found then
      raise exception 'Parent comment does not exist';
    end if;
    if parent_record.post_id <> new.post_id then
      raise exception 'Parent comment must belong to the same post';
    end if;
    if parent_record.parent_comment_id is not null then
      raise exception 'Replies cannot be nested more than one level';
    end if;
    if parent_record.status <> 'PUBLISHED' then
      raise exception 'Cannot reply to an unavailable comment';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists comments_validate_parent on public.comments;
create trigger comments_validate_parent
before insert or update of post_id, parent_comment_id on public.comments
for each row execute function public.validate_comment_parent();

revoke all on function public.validate_comment_parent() from public;
revoke all on function public.validate_comment_parent() from anon;
revoke all on function public.validate_comment_parent() from authenticated;

-- Core in-app comment notification. Delivery preferences are intentionally not
-- consulted here; they belong to optional push/email delivery workers.
create or replace function public.create_comment_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  notification_kind public.notification_type;
begin
  if new.status <> 'PUBLISHED' then
    return new;
  end if;

  if new.parent_comment_id is not null then
    select c.user_id into recipient
    from public.comments c
    where c.id = new.parent_comment_id;
    notification_kind := 'COMMENT_REPLY'::public.notification_type;
  else
    select p.user_id into recipient
    from public.posts p
    where p.id = new.post_id;
    notification_kind := 'COMMENT'::public.notification_type;
  end if;

  if recipient is null or recipient = new.user_id then
    return new;
  end if;

  if public.is_blocked_between(recipient, new.user_id) then
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
    recipient,
    new.user_id,
    notification_kind,
    'COMMENT'::public.notification_entity_type,
    new.id
  where exists (
    select 1 from public.users u
    where u.id = new.user_id and u.account_status = 'ACTIVE'
  )
  and exists (
    select 1 from public.users u
    where u.id = recipient and u.account_status = 'ACTIVE'
  );

  return new;
end;
$$;

drop trigger if exists comments_create_notification on public.comments;
create trigger comments_create_notification
after insert on public.comments
for each row execute function public.create_comment_notification();

revoke all on function public.create_comment_notification() from public;
revoke all on function public.create_comment_notification() from anon;
revoke all on function public.create_comment_notification() from authenticated;

-- Toggle comment likes atomically. The caller's identity is taken from
-- auth.uid(), never from a client-supplied user_id.
create or replace function public.toggle_comment_like(target_comment_id uuid)
returns table(liked boolean, like_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_post_id uuid;
  existing_like uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select c.post_id into target_post_id
  from public.comments c
  where c.id = target_comment_id
    and c.status = 'PUBLISHED';

  if target_post_id is null or not public.can_view_post(target_post_id) then
    raise exception 'Comment is not available';
  end if;

  if public.is_blocked_between((select c.user_id from public.comments c where c.id = target_comment_id)) then
    raise exception 'Comment interaction is unavailable';
  end if;

  select cl.id into existing_like
  from public.comment_likes cl
  where cl.comment_id = target_comment_id
    and cl.user_id = auth.uid();

  if existing_like is null then
    insert into public.comment_likes (comment_id, user_id)
    values (target_comment_id, auth.uid());
  else
    delete from public.comment_likes where id = existing_like;
  end if;

  return query
  select
    exists (
      select 1 from public.comment_likes cl
      where cl.comment_id = target_comment_id and cl.user_id = auth.uid()
    ),
    (select count(*) from public.comment_likes cl where cl.comment_id = target_comment_id);
end;
$$;

drop trigger if exists comment_likes_create_notification on public.comment_likes;
create or replace function public.create_comment_like_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  post_id_value uuid;
begin
  select c.user_id, c.post_id into recipient, post_id_value
  from public.comments c
  where c.id = new.comment_id and c.status = 'PUBLISHED';

  if recipient is null or recipient = new.user_id then
    return new;
  end if;

  if public.is_blocked_between(recipient, new.user_id) then
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
    recipient,
    new.user_id,
    'COMMENT_LIKE'::public.notification_type,
    'COMMENT'::public.notification_entity_type,
    new.comment_id
  where public.can_view_post(post_id_value)
    and exists (select 1 from public.users u where u.id = new.user_id and u.account_status = 'ACTIVE')
    and exists (select 1 from public.users u where u.id = recipient and u.account_status = 'ACTIVE');

  return new;
end;
$$;

create trigger comment_likes_create_notification
after insert on public.comment_likes
for each row execute function public.create_comment_like_notification();

revoke all on function public.create_comment_like_notification() from public;
revoke all on function public.create_comment_like_notification() from anon;
revoke all on function public.create_comment_like_notification() from authenticated;

revoke all on function public.toggle_comment_like(uuid) from public;
revoke all on function public.toggle_comment_like(uuid) from anon;
grant execute on function public.toggle_comment_like(uuid) to authenticated;

-- Read comments through the same post-level authorization boundary used by the
-- feed. Blocked commenters are excluded even when the post itself is visible.
create or replace function public.get_post_comments(target_post_id uuid, page_limit integer default 50, before_created_at timestamptz default null, before_comment_id uuid default null)
returns table(
  comment_id uuid,
  user_id uuid,
  username varchar,
  display_name varchar,
  avatar_path text,
  parent_comment_id uuid,
  content text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.user_id,
    pr.username,
    pr.display_name,
    pr.avatar_path,
    c.parent_comment_id,
    c.content,
    c.created_at
  from public.comments c
  join public.profiles pr on pr.user_id = c.user_id
  where c.post_id = target_post_id
    and c.status = 'PUBLISHED'
    and public.can_view_post(c.post_id)
    and not public.is_blocked_between(c.user_id)
    and (
      before_created_at is null
      or c.created_at < before_created_at
      or (c.created_at = before_created_at and c.id < before_comment_id)
    )
  order by c.created_at desc, c.id desc
  limit least(greatest(coalesce(page_limit, 50), 1), 100);
$$;

revoke all on function public.get_post_comments(uuid, integer, timestamptz, uuid) from public;
revoke all on function public.get_post_comments(uuid, integer, timestamptz, uuid) from anon;
grant execute on function public.get_post_comments(uuid, integer, timestamptz, uuid) to authenticated;

commit;
