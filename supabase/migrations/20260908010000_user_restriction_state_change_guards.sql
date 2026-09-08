begin;

-- Keep the restriction decision itself under the repository-wide SECURITY
-- DEFINER empty-search-path contract.
create or replace function public.is_user_restricted(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.moderation_actions ma
    where ma.target_type = 'USER'
      and ma.target_id = target_user_id
      and ma.action_type = 'USER_RESTRICTED'
      and ma.revoked_at is null
      and ma.starts_at <= now()
      and (ma.expires_at is null or ma.expires_at > now())
  );
$$;

revoke all on function public.is_user_restricted(uuid) from public, anon;
grant execute on function public.is_user_restricted(uuid) to authenticated;

-- USER_RESTRICTED is an authorization state, not a UI-only flag. Enforce it
-- at the database boundary for ordinary user-generated social/content writes.
-- Safety operations such as block/report remain available so a restricted user
-- can still protect themselves and report abuse.
create or replace function public.enforce_user_restriction_on_state_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_user_restricted(auth.uid()) then
    raise exception 'Account is temporarily restricted from this action';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_user_restriction_on_state_change() from public, anon;

-- User-generated social/content state changes.
drop trigger if exists enforce_user_restriction_follow on public.follows;
create trigger enforce_user_restriction_follow
before insert or update or delete on public.follows
for each row execute function public.enforce_user_restriction_on_state_change();

drop trigger if exists enforce_user_restriction_post on public.posts;
create trigger enforce_user_restriction_post
before insert or update or delete on public.posts
for each row execute function public.enforce_user_restriction_on_state_change();

drop trigger if exists enforce_user_restriction_post_media on public.post_media;
create trigger enforce_user_restriction_post_media
before insert or update or delete on public.post_media
for each row execute function public.enforce_user_restriction_on_state_change();

drop trigger if exists enforce_user_restriction_post_like on public.post_likes;
create trigger enforce_user_restriction_post_like
before insert or update or delete on public.post_likes
for each row execute function public.enforce_user_restriction_on_state_change();

drop trigger if exists enforce_user_restriction_comment on public.comments;
create trigger enforce_user_restriction_comment
before insert or update or delete on public.comments
for each row execute function public.enforce_user_restriction_on_state_change();

drop trigger if exists enforce_user_restriction_comment_like on public.comment_likes;
create trigger enforce_user_restriction_comment_like
before insert or update or delete on public.comment_likes
for each row execute function public.enforce_user_restriction_on_state_change();

drop trigger if exists enforce_user_restriction_post_share on public.post_shares;
create trigger enforce_user_restriction_post_share
before insert or update or delete on public.post_shares
for each row execute function public.enforce_user_restriction_on_state_change();

drop trigger if exists enforce_user_restriction_mention on public.mentions;
create trigger enforce_user_restriction_mention
before insert or update or delete on public.mentions
for each row execute function public.enforce_user_restriction_on_state_change();

drop trigger if exists enforce_user_restriction_post_tag on public.post_tags;
create trigger enforce_user_restriction_post_tag
before insert or update or delete on public.post_tags
for each row execute function public.enforce_user_restriction_on_state_change();

drop trigger if exists enforce_user_restriction_message on public.messages;
create trigger enforce_user_restriction_message
before insert or update or delete on public.messages
for each row execute function public.enforce_user_restriction_on_state_change();

commit;
