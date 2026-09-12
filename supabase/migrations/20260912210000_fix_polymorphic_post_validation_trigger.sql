begin;

-- validate_post_final is shared by triggers on both posts and post_media.
-- A polymorphic NEW record cannot safely reference a field that does not
-- exist on the triggering table, even when the reference is in an unused
-- CASE branch. Read the required identifiers from the row JSON instead.
create or replace function public.validate_post_final()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  target_post_id uuid;
  post_status public.post_status;
  post_content text;
  media_count integer;
  row_json jsonb;
begin
  if tg_table_name = 'post_media' then
    row_json := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
    target_post_id := nullif(row_json ->> 'post_id', '')::uuid;
  else
    row_json := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
    target_post_id := nullif(row_json ->> 'id', '')::uuid;
  end if;

  if target_post_id is null then
    return coalesce(new, old);
  end if;

  select p.status, p.content
    into post_status, post_content
  from public.posts p
  where p.id = target_post_id;

  if post_status is null then
    return coalesce(new, old);
  end if;

  if post_status <> 'DELETED' then
    select count(*)
      into media_count
    from public.post_media pm
    where pm.post_id = target_post_id
      and pm.deleted_at is null;

    if coalesce(char_length(trim(post_content)), 0) = 0 and media_count = 0 then
      raise exception 'Post must contain text or media';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

commit;
