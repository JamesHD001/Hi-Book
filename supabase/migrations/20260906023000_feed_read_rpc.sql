-- Hi!Book 2.0 — secure post feed read model
-- Read-only RPC. It never weakens table RLS and exposes only feed-safe fields.

begin;

create or replace function public.get_post_feed(
  feed_scope text default 'HOME',
  page_limit integer default 20,
  before_created_at timestamptz default null,
  before_post_id uuid default null
)
returns table (
  post_id uuid,
  author_id uuid,
  username varchar,
  display_name varchar,
  avatar_path text,
  content text,
  visibility post_visibility,
  created_at timestamptz,
  published_at timestamptz,
  media jsonb
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

  if feed_scope not in ('HOME','FOLLOWING','EXPLORE') then
    raise exception 'Invalid feed scope';
  end if;

  page_limit := greatest(1, least(coalesce(page_limit, 20), 50));

  return query
  with eligible_posts as (
    select
      p.id,
      p.user_id,
      p.content,
      p.visibility,
      p.created_at,
      p.published_at
    from public.posts p
    where p.status = 'PUBLISHED'
      and p.published_at is not null
      and not public.is_blocked_between(p.user_id)
      and (
        p.user_id = auth.uid()
        or (
          p.visibility = 'PUBLIC'
          and feed_scope in ('HOME','EXPLORE')
        )
        or (
          p.visibility = 'FOLLOWERS'
          and exists (
            select 1
            from public.follows f
            where f.follower_id = auth.uid()
              and f.following_id = p.user_id
          )
          and feed_scope in ('HOME','FOLLOWING')
        )
      )
      and (
        feed_scope <> 'FOLLOWING'
        or p.user_id = auth.uid()
        or exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.following_id = p.user_id
        )
      )
      and (
        before_created_at is null
        or p.created_at < before_created_at
        or (p.created_at = before_created_at and p.id < before_post_id)
      )
    order by p.created_at desc, p.id desc
    limit page_limit
  )
  select
    ep.id,
    ep.user_id,
    pr.username,
    pr.display_name,
    pr.avatar_path,
    ep.content,
    ep.visibility,
    ep.created_at,
    ep.published_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', pm.id,
            'storage_path', pm.storage_path,
            'mime_type', pm.mime_type,
            'width', pm.width,
            'height', pm.height,
            'display_order', pm.display_order,
            'alt_text', pm.alt_text
          ) order by pm.display_order asc
        )
        from public.post_media pm
        where pm.post_id = ep.id
          and pm.deleted_at is null
      ),
      '[]'::jsonb
    ) as media
  from eligible_posts ep
  join public.profiles pr on pr.user_id = ep.user_id
  order by ep.created_at desc, ep.id desc;
end;
$$;

revoke all on function public.get_post_feed(text, integer, timestamptz, uuid) from public, anon;
grant execute on function public.get_post_feed(text, integer, timestamptz, uuid) to authenticated;

commit;
