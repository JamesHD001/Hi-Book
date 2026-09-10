begin;

-- Batch the read side of post likes so a feed page never issues one RPC per
-- post. Authorization is evaluated per post inside the database.
create or replace function public.get_post_like_states(target_post_ids uuid[])
returns table (
  post_id uuid,
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

  if coalesce(cardinality(target_post_ids), 0) > 100 then
    raise exception 'Too many posts requested';
  end if;

  return query
  select
    p.id,
    exists (
      select 1
      from public.post_likes own_like
      where own_like.post_id = p.id
        and own_like.user_id = auth.uid()
    ),
    count(l.id)::bigint
  from public.posts p
  left join public.post_likes l on l.post_id = p.id
  where p.id = any(coalesce(target_post_ids, array[]::uuid[]))
    and p.status = 'PUBLISHED'
    and public.can_view_post(p.id)
  group by p.id;
end;
$$;

revoke all on function public.get_post_like_states(uuid[]) from public, anon;
grant execute on function public.get_post_like_states(uuid[]) to authenticated;

commit;
