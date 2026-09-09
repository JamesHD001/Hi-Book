begin;

-- Cross-domain enforcement for USER_RESTRICTED accounts.
-- Privileged SECURITY DEFINER RPCs execute under their function owner and are
-- therefore unaffected; ordinary client table writes remain blocked here.
-- Use JSONB field lookup because NEW is a polymorphic trigger record and a
-- trigger function cannot reference columns that are absent from every table.
create or replace function public.guard_restricted_social_write()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_actor_id uuid;
begin
  v_actor_id := case tg_table_name
    when 'follows' then nullif(to_jsonb(new)->>'follower_id', '')::uuid
    when 'posts' then nullif(to_jsonb(new)->>'user_id', '')::uuid
    when 'comments' then nullif(to_jsonb(new)->>'user_id', '')::uuid
    when 'post_likes' then nullif(to_jsonb(new)->>'user_id', '')::uuid
    when 'comment_likes' then nullif(to_jsonb(new)->>'user_id', '')::uuid
    when 'post_shares' then nullif(to_jsonb(new)->>'user_id', '')::uuid
    when 'messages' then nullif(to_jsonb(new)->>'sender_id', '')::uuid
    else null
  end;

  if auth.uid() is not null
     and auth.uid() = v_actor_id
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
