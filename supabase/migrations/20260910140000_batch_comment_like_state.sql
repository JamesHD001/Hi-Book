begin;

-- Batch comment-like hydration for the comments panel. The function only
-- returns comments the caller is already authorized to view.
create or replace function public.get_comment_like_states(target_comment_ids uuid[])
returns table (
  comment_id uuid,
  liked boolean,
  like_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(cardinality(target_comment_ids), 0) > 200 then
    raise exception 'Too many comments requested';
  end if;

  return query
  select
    c.id,
    exists (
      select 1
      from public.comment_likes own_like
      where own_like.comment_id = c.id
        and own_like.user_id = auth.uid()
    ),
    count(cl.id)::bigint
  from public.comments c
  join public.posts p on p.id = c.post_id
  left join public.comment_likes cl on cl.comment_id = c.id
  where c.id = any(coalesce(target_comment_ids, array[]::uuid[]))
    and c.status = 'PUBLISHED'
    and p.status = 'PUBLISHED'
    and public.can_view_post(c.post_id)
  group by c.id;
end;
$$;

revoke all on function public.get_comment_like_states(uuid[]) from public, anon;
grant execute on function public.get_comment_like_states(uuid[]) to authenticated;

commit;
