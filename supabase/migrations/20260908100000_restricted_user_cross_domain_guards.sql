begin;

-- Cross-domain enforcement for USER_RESTRICTED accounts.
-- Privileged SECURITY DEFINER RPCs execute under their function owner and are
-- therefore unaffected; ordinary client table writes remain blocked here.

create or replace function public.guard_restricted_social_write()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is not null
     and auth.uid() = coalesce(
       case when tg_table_name = 'follows' then new.follower_id else null end,
       case when tg_table_name = 'posts' then new.user_id else null end,
       case when tg_table_name = 'comments' then new.user_id else null end,
       case when tg_table_name = 'post_likes' then new.user_id else null end,
       case when tg_table_name = 'comment_likes' then new.user_id else null end,
       case when tg_table_name = 'post_shares' then new.user_id else null end,
       case when tg_table_name = 'messages' then new.sender_id else null end
     )
     and public.is_user_restricted(auth.uid())
     and current_user = 'authenticated' then
    raise exception 'Account is temporarily restricted from social activity';
  end if;

  return new;
end;
$$;

-- Only ordinary client INSERTs are guarded. Trusted/server RPC execution is
-- intentionally allowed to complete its own transactional work.
drop trigger if exists trg_restricted_follows on public.follows;
create trigger trg_restricted_follows
before insert on public.follows
for each row execute function public.guard_restricted_social_write();

drop trigger if exists trg_restricted_posts on public.posts;
create trigger trg_restricted_posts
before insert on public.posts
for each row execute function public.guard_restricted_social_write();

drop trigger if exists trg_restricted_comments on public.comments;
create trigger trg_restricted_comments
before insert on public.comments
for each row execute function public.guard_restricted_social_write();

drop trigger if exists trg_restricted_post_likes on public.post_likes;
create trigger trg_restricted_post_likes
before insert on public.post_likes
for each row execute function public.guard_restricted_social_write();

drop trigger if exists trg_restricted_comment_likes on public.comment_likes;
create trigger trg_restricted_comment_likes
before insert on public.comment_likes
for each row execute function public.guard_restricted_social_write();

drop trigger if exists trg_restricted_post_shares on public.post_shares;
create trigger trg_restricted_post_shares
before insert on public.post_shares
for each row execute function public.guard_restricted_social_write();

drop trigger if exists trg_restricted_messages on public.messages;
create trigger trg_restricted_messages
before insert on public.messages
for each row execute function public.guard_restricted_social_write();

commit;
