begin;

create or replace function public.create_comment(
  target_post_id uuid,
  comment_content text,
  parent_comment_id_input uuid default null
)
returns table(
  comment_id uuid,
  user_id uuid,
  parent_comment_id uuid,
  content text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_content text := trim(comment_content);
  inserted_id uuid;
  inserted_created_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if clean_content is null or char_length(clean_content) < 1 or char_length(clean_content) > 2000 then
    raise exception 'Comment must contain between 1 and 2000 characters';
  end if;
  if not public.can_view_post(target_post_id) then raise exception 'Post is not available'; end if;

  insert into public.comments (post_id, user_id, parent_comment_id, content, status, published_at)
  values (target_post_id, auth.uid(), parent_comment_id_input, clean_content, 'PUBLISHED', now())
  returning id, comments.created_at into inserted_id, inserted_created_at;

  return query
  select inserted_id, auth.uid(), parent_comment_id_input, clean_content, inserted_created_at;
end;
$$;

-- The comments table does not have published_at; recreate the function without
-- relying on a non-existent column while retaining the same authorization.
create or replace function public.create_comment(
  target_post_id uuid,
  comment_content text,
  parent_comment_id_input uuid default null
)
returns table(
  comment_id uuid,
  user_id uuid,
  parent_comment_id uuid,
  content text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_content text := trim(comment_content);
  inserted_id uuid;
  inserted_created_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if clean_content is null or char_length(clean_content) < 1 or char_length(clean_content) > 2000 then
    raise exception 'Comment must contain between 1 and 2000 characters';
  end if;
  if not public.can_view_post(target_post_id) then raise exception 'Post is not available'; end if;

  insert into public.comments (post_id, user_id, parent_comment_id, content, status)
  values (target_post_id, auth.uid(), parent_comment_id_input, clean_content, 'PUBLISHED')
  returning comments.id, comments.created_at into inserted_id, inserted_created_at;

  return query select inserted_id, auth.uid(), parent_comment_id_input, clean_content, inserted_created_at;
end;
$$;

revoke all on function public.create_comment(uuid, text, uuid) from public;
revoke all on function public.create_comment(uuid, text, uuid) from anon;
grant execute on function public.create_comment(uuid, text, uuid) to authenticated;

create or replace function public.get_comment_like_state(target_comment_id uuid)
returns table(liked boolean, like_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.comment_likes cl
      where cl.comment_id = target_comment_id and cl.user_id = auth.uid()
    ),
    (select count(*) from public.comment_likes cl where cl.comment_id = target_comment_id);
$$;

revoke all on function public.get_comment_like_state(uuid) from public;
revoke all on function public.get_comment_like_state(uuid) from anon;
grant execute on function public.get_comment_like_state(uuid) to authenticated;

commit;
