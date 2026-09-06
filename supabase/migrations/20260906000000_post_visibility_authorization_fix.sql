-- Hi!Book 2.0 — post visibility authorization fix
-- Fixes follower visibility checks that were evaluated through RLS-protected
-- follows rows from inside the posts policy.

begin;

-- Authorization helpers used by RLS must inspect authoritative relationship
-- tables without being trapped by the caller's row-level visibility.
create or replace function public.can_view_post(target_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = target_post_id
      and (
        p.user_id = auth.uid()
        or (
          p.status = 'PUBLISHED'
          and not public.is_blocked_between(p.user_id)
          and (
            p.visibility = 'PUBLIC'
            or (
              p.visibility = 'FOLLOWERS'
              and exists (
                select 1
                from public.follows f
                where f.follower_id = auth.uid()
                  and f.following_id = p.user_id
              )
            )
          )
        )
      )
  );
$$;

revoke all on function public.can_view_post(uuid) from public;
grant execute on function public.can_view_post(uuid) to authenticated;

-- Replace the policy's direct relationship-table lookup with the helper.
-- This preserves the same authorization rule while making it work correctly
-- under RLS: public/followers/private visibility, ownership and block barriers.
drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts
for select using (
  public.can_view_post(id)
  or public.is_admin_permission('posts.view')
);

-- Child content must use the same post-level authorization decision.
drop policy if exists post_media_select on public.post_media;
create policy post_media_select on public.post_media
for select using (
  public.can_view_post(post_id)
  or public.is_admin_permission('posts.view')
);

drop policy if exists post_likes_select on public.post_likes;
create policy post_likes_select on public.post_likes
for select using (
  public.can_view_post(post_id)
);

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
for select using (
  public.can_view_post(post_id)
  and (
    comments.user_id = auth.uid()
    or not public.is_blocked_between(comments.user_id)
  )
  or public.is_admin_permission('posts.view')
);

drop policy if exists comment_likes_select on public.comment_likes;
create policy comment_likes_select on public.comment_likes
for select using (
  exists (
    select 1
    from public.comments c
    where c.id = comment_likes.comment_id
      and c.status = 'PUBLISHED'
      and public.can_view_post(c.post_id)
  )
);

commit;
