-- Hi!Book 2.0 — RLS visibility corrections
-- Closes private-content leakage paths in media, comments and likes.

begin;

-- Profiles do not store visibility. The canonical setting is user_privacy_settings.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (
  user_id = auth.uid()
  or (
    exists (
      select 1 from public.user_privacy_settings ups
      where ups.user_id = profiles.user_id
        and ups.profile_visibility = 'PUBLIC'
    )
    and not public.is_blocked_between(user_id)
  )
  or public.is_admin_permission('users.view')
);

-- A post's authorization must be inherited by every child content table.
drop policy if exists post_media_select on public.post_media;
create policy post_media_select on public.post_media
for select using (
  exists (
    select 1
    from public.posts p
    where p.id = post_media.post_id
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
                select 1 from public.follows f
                where f.follower_id = auth.uid()
                  and f.following_id = p.user_id
              )
            )
          )
        )
        or public.is_admin_permission('posts.view')
      )
  )
);

drop policy if exists post_likes_select on public.post_likes;
create policy post_likes_select on public.post_likes
for select using (
  exists (
    select 1 from public.posts p
    where p.id = post_likes.post_id
      and p.status = 'PUBLISHED'
      and not public.is_blocked_between(p.user_id)
      and (
        p.visibility = 'PUBLIC'
        or p.user_id = auth.uid()
        or (p.visibility='FOLLOWERS' and exists (
          select 1 from public.follows f
          where f.follower_id=auth.uid() and f.following_id=p.user_id
        ))
      )
  )
);

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
for select using (
  exists (
    select 1 from public.posts p
    where p.id = comments.post_id
      and (
        p.user_id = auth.uid()
        or (
          p.status='PUBLISHED'
          and not public.is_blocked_between(p.user_id)
          and (
            p.visibility='PUBLIC'
            or (p.visibility='FOLLOWERS' and exists (
              select 1 from public.follows f
              where f.follower_id=auth.uid() and f.following_id=p.user_id
            ))
          )
        )
        or public.is_admin_permission('posts.view')
      )
  )
  and (comments.user_id = auth.uid() or not public.is_blocked_between(comments.user_id))
);

drop policy if exists comment_likes_select on public.comment_likes;
create policy comment_likes_select on public.comment_likes
for select using (
  exists (
    select 1
    from public.comments c
    join public.posts p on p.id=c.post_id
    where c.id=comment_likes.comment_id
      and c.status='PUBLISHED'
      and p.status='PUBLISHED'
      and not public.is_blocked_between(p.user_id)
      and (
        p.visibility='PUBLIC'
        or p.user_id=auth.uid()
        or (p.visibility='FOLLOWERS' and exists (
          select 1 from public.follows f
          where f.follower_id=auth.uid() and f.following_id=p.user_id
        ))
      )
  )
);

-- Direct table inserts for posts are disabled; creation goes through create_post RPC,
-- which atomically validates post + media metadata.
drop policy if exists posts_insert on public.posts;

commit;
