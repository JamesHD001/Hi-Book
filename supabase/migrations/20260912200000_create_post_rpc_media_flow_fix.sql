begin;

-- The canonical RLS model intentionally removed direct client INSERT access
-- to public.posts. Keep post creation behind the transactional create_post RPC.
-- The client may prepare/upload media first, so the RPC accepts a caller-generated
-- post id and records the matching media metadata in the same database transaction.

drop function if exists public.create_post(text, public.post_visibility, jsonb);
drop function if exists public.create_post(uuid, text, public.post_visibility, jsonb);

create or replace function public.create_post(
  p_post_id uuid,
  p_content text,
  p_visibility public.post_visibility default 'PUBLIC',
  p_media jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_post_id uuid := p_post_id;
  v_item jsonb;
  v_order integer := 0;
  v_path text;
  v_mime text;
  v_size bigint;
  v_width integer;
  v_height integer;
  v_alt text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_user_id
      and u.account_status = 'ACTIVE'
  ) then
    raise exception 'Active account required';
  end if;

  if v_post_id is null then
    raise exception 'Post id is required';
  end if;

  if coalesce(char_length(p_content), 0) > 5000 then
    raise exception 'Post content exceeds 5000 characters';
  end if;

  if jsonb_typeof(p_media) <> 'array' then
    raise exception 'Media must be a JSON array';
  end if;

  if jsonb_array_length(p_media) > 10 then
    raise exception 'A post may contain at most 10 images';
  end if;

  if coalesce(char_length(trim(p_content)), 0) = 0
     and jsonb_array_length(p_media) = 0 then
    raise exception 'Post must contain text or media';
  end if;

  insert into public.posts (
    id,
    user_id,
    content,
    visibility,
    status,
    published_at
  ) values (
    v_post_id,
    v_user_id,
    nullif(trim(p_content), ''),
    p_visibility,
    'PUBLISHED',
    now()
  );

  for v_item in select * from jsonb_array_elements(p_media) loop
    v_path := v_item->>'storage_path';
    v_mime := v_item->>'mime_type';
    v_size := nullif(v_item->>'file_size', '')::bigint;
    v_width := nullif(v_item->>'width', '')::integer;
    v_height := nullif(v_item->>'height', '')::integer;
    v_alt := left(v_item->>'alt_text', 500);

    if v_path is null
       or v_path !~ ('^posts/' || v_user_id::text || '/' || v_post_id::text || '/[^/]+$') then
      raise exception 'Invalid post media storage path';
    end if;

    if v_mime not in ('image/jpeg', 'image/png', 'image/webp', 'image/gif') then
      raise exception 'Unsupported image MIME type';
    end if;

    if v_size is null or v_size <= 0 or v_size > 10485760 then
      raise exception 'Invalid image size';
    end if;

    insert into public.post_media (
      id,
      post_id,
      media_type,
      storage_path,
      mime_type,
      file_size,
      width,
      height,
      display_order,
      alt_text
    ) values (
      gen_random_uuid(),
      v_post_id,
      'IMAGE',
      v_path,
      v_mime,
      v_size,
      v_width,
      v_height,
      v_order,
      v_alt
    );

    v_order := v_order + 1;
  end loop;

  return v_post_id;
end;
$$;

revoke all on function public.create_post(uuid, text, public.post_visibility, jsonb) from public, anon;
grant execute on function public.create_post(uuid, text, public.post_visibility, jsonb) to authenticated;

-- Preserve the original no-explicit-id RPC contract for callers that do not
-- need to coordinate a storage path before the database transaction.
create or replace function public.create_post(
  p_content text,
  p_visibility public.post_visibility default 'PUBLIC',
  p_media jsonb default '[]'::jsonb
)
returns uuid
language sql
security definer
set search_path = pg_catalog, public
as $$
  select public.create_post(gen_random_uuid(), p_content, p_visibility, p_media);
$$;

revoke all on function public.create_post(text, public.post_visibility, jsonb) from public, anon;
grant execute on function public.create_post(text, public.post_visibility, jsonb) to authenticated;

commit;
