-- Hi!Book 2.0 — secure post sharing
-- POST_SHARE is an event: repeated shares by the same user are allowed.
-- Sharing never grants access to the post.

begin;

create or replace function public.share_post(target_post_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_post_owner uuid;
  v_share_id uuid := gen_random_uuid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.users
    where id = v_user_id and account_status = 'ACTIVE'
  ) then
    raise exception 'Active account required';
  end if;

  select p.user_id into v_post_owner
  from public.posts p
  where p.id = target_post_id
    and p.status = 'PUBLISHED'
    and p.published_at is not null
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = v_user_id and b.blocked_id = p.user_id)
         or (b.blocker_id = p.user_id and b.blocked_id = v_user_id)
    )
    and (
      p.user_id = v_user_id
      or p.visibility = 'PUBLIC'
      or (
        p.visibility = 'FOLLOWERS'
        and exists (
          select 1 from public.follows f
          where f.follower_id = v_user_id
            and f.following_id = p.user_id
        )
      )
    );

  if v_post_owner is null then
    raise exception 'Post is not accessible';
  end if;

  insert into public.post_shares (id, post_id, user_id)
  values (v_share_id, target_post_id, v_user_id);

  if v_post_owner <> v_user_id then
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      entity_type,
      entity_id
    ) values (
      v_post_owner,
      v_user_id,
      'POST_SHARE'::public.notification_type,
      'POST'::public.notification_entity_type,
      target_post_id
    );
  end if;

  return v_share_id;
end;
$$;

create or replace function public.share_post_to_conversation(
  target_post_id uuid,
  target_conversation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_message_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  -- send_message enforces participant membership, recipient message permission,
  -- block barriers, conversation type, and shared-post visibility.
  perform public.share_post(target_post_id);

  v_message_id := public.send_message(
    target_conversation_id,
    'POST_SHARE'::public.message_type,
    null,
    target_post_id,
    null,
    '[]'::jsonb
  );

  return v_message_id;
end;
$$;

revoke all on function public.share_post(uuid) from public;
revoke all on function public.share_post(uuid) from anon;
grant execute on function public.share_post(uuid) to authenticated;

revoke all on function public.share_post_to_conversation(uuid, uuid) from public;
revoke all on function public.share_post_to_conversation(uuid, uuid) from anon;
grant execute on function public.share_post_to_conversation(uuid, uuid) to authenticated;

-- Clients must use the authorization-aware RPC instead of inserting share events directly.
revoke insert, update, delete on public.post_shares from authenticated;

commit;
