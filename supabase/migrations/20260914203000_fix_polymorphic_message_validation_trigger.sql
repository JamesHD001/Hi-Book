-- Hi!Book 2.0 — fix polymorphic message validation trigger rowtype access
-- A trigger function shared by messages and message_media cannot directly reference
-- NEW.message_id because NEW is compiled against the current trigger table's rowtype.
-- Extract the relevant key from JSON so both trigger targets remain valid.

begin;

create or replace function public.validate_message_final()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  row_json jsonb;
  target_message_id uuid;
  msg_type message_type;
  msg_content text;
  shared_id uuid;
  media_count integer;
begin
  row_json := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;

  if tg_table_name = 'message_media' then
    target_message_id := nullif(row_json ->> 'message_id', '')::uuid;
  else
    target_message_id := nullif(row_json ->> 'id', '')::uuid;
  end if;

  select m.message_type, m.content, m.shared_post_id
    into msg_type, msg_content, shared_id
  from public.messages m
  where m.id = target_message_id;

  if msg_type is null then
    return coalesce(new, old);
  end if;

  if msg_type = 'TEXT' and coalesce(char_length(trim(msg_content)), 0) = 0 then
    raise exception 'Text message requires content';
  end if;

  if msg_type = 'POST_SHARE' and shared_id is null then
    raise exception 'Post-share message requires shared_post_id';
  end if;

  if msg_type <> 'POST_SHARE' and shared_id is not null then
    raise exception 'Only POST_SHARE messages may reference a shared post';
  end if;

  select count(*) into media_count
  from public.message_media mm
  where mm.message_id = target_message_id
    and mm.deleted_at is null;

  if msg_type = 'IMAGE' and media_count = 0 then
    raise exception 'Image message requires media';
  end if;

  return coalesce(new, old);
end;
$$;

commit;
