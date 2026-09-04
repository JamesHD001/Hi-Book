-- Hi!Book 2.0 — transactional messaging RPC foundation

begin;

create or replace function public.send_message(
  p_conversation_id uuid,
  p_message_type message_type default 'TEXT',
  p_content text default null,
  p_shared_post_id uuid default null,
  p_reply_to_message_id uuid default null,
  p_media jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_message_id uuid := gen_random_uuid();
  v_other_user_id uuid;
  v_item jsonb;
  v_order integer := 0;
  v_path text;
  v_mime text;
  v_size bigint;
  v_width integer;
  v_height integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.users where id=v_user_id and account_status='ACTIVE') then raise exception 'Active account required'; end if;
  if not exists (select 1 from public.conversations where id=p_conversation_id and type='DIRECT') then raise exception 'Conversation unavailable'; end if;
  if not public.is_conversation_participant(p_conversation_id) then raise exception 'Not a conversation participant'; end if;

  select cp.user_id into v_other_user_id
  from public.conversation_participants cp
  where cp.conversation_id=p_conversation_id and cp.user_id<>v_user_id
  limit 1;

  if v_other_user_id is null then raise exception 'Direct conversation requires two participants'; end if;
  if public.is_blocked_between(v_other_user_id) then raise exception 'Messaging unavailable'; end if;
  if not public.can_message_user(v_other_user_id) then raise exception 'Messaging not permitted'; end if;

  if p_message_type='TEXT' and coalesce(char_length(trim(p_content)),0)=0 then raise exception 'Text message requires content'; end if;
  if p_message_type='TEXT' and char_length(p_content)>4000 then raise exception 'Message exceeds 4000 characters'; end if;
  if p_message_type='POST_SHARE' and p_shared_post_id is null then raise exception 'Post share requires a post'; end if;
  if p_message_type<>'POST_SHARE' and p_shared_post_id is not null then raise exception 'Invalid shared post reference'; end if;
  if jsonb_typeof(p_media) <> 'array' then raise exception 'Media must be a JSON array'; end if;
  if p_message_type='IMAGE' and jsonb_array_length(p_media) < 1 then raise exception 'Image message requires media'; end if;
  if p_message_type<>'IMAGE' and jsonb_array_length(p_media) > 0 then raise exception 'Media is only supported for IMAGE messages in MVP'; end if;
  if jsonb_array_length(p_media)>10 then raise exception 'A message may contain at most 10 images'; end if;

  if p_shared_post_id is not null and not exists (
    select 1 from public.posts p
    where p.id=p_shared_post_id and p.status='PUBLISHED'
      and not public.is_blocked_between(p.user_id)
      and (p.visibility='PUBLIC' or p.user_id=v_user_id or (p.visibility='FOLLOWERS' and exists (
        select 1 from public.follows f where f.follower_id=v_user_id and f.following_id=p.user_id
      )))
  ) then
    raise exception 'Shared post is not accessible';
  end if;

  if p_reply_to_message_id is not null and not exists (
    select 1 from public.messages m where m.id=p_reply_to_message_id and m.conversation_id=p_conversation_id
  ) then
    raise exception 'Reply target is not in this conversation';
  end if;

  insert into public.messages(id,conversation_id,sender_id,message_type,content,shared_post_id,reply_to_message_id,status)
  values (v_message_id,p_conversation_id,v_user_id,p_message_type,nullif(trim(p_content),''),p_shared_post_id,p_reply_to_message_id,'SENT');

  for v_item in select * from jsonb_array_elements(p_media) loop
    v_path := v_item->>'storage_path';
    v_mime := v_item->>'mime_type';
    v_size := (v_item->>'file_size')::bigint;
    v_width := nullif(v_item->>'width','')::integer;
    v_height := nullif(v_item->>'height','')::integer;

    if v_path is null or position('messages/' || v_user_id::text || '/' || p_conversation_id::text || '/' || v_message_id::text || '/' in v_path) <> 1 then
      raise exception 'Invalid message media storage path';
    end if;
    if v_mime not in ('image/jpeg','image/png','image/webp','image/gif') then raise exception 'Unsupported image MIME type'; end if;
    if v_size is null or v_size<=0 or v_size>10485760 then raise exception 'Invalid image size'; end if;

    insert into public.message_media(id,message_id,media_type,storage_path,mime_type,file_size,width,height,display_order)
    values(gen_random_uuid(),v_message_id,'IMAGE',v_path,v_mime,v_size,v_width,v_height,v_order);
    v_order := v_order + 1;
  end loop;

  return v_message_id;
end;
$$;

revoke all on function public.send_message(uuid,message_type,text,uuid,uuid,jsonb) from public;
grant execute on function public.send_message(uuid,message_type,text,uuid,uuid,jsonb) to authenticated;

commit;
