-- Hi!Book 2.0 — authenticated mutation abuse controls
-- Enforces per-user write limits inside PostgreSQL so browser-side throttling cannot bypass them.
-- Supabase Auth owns unauthenticated sign-up/sign-in rate limiting separately.

begin;

create schema if not exists private;

create table if not exists private.rate_limit_rules (
  action_key text primary key,
  max_events integer not null check (max_events > 0),
  window_seconds integer not null check (window_seconds > 0)
);

insert into private.rate_limit_rules (action_key, max_events, window_seconds)
values
  ('post_create', 20, 60),
  ('comment_create', 30, 60),
  ('message_create', 60, 60),
  ('follow_create', 60, 60),
  ('post_like_create', 120, 60),
  ('comment_like_create', 120, 60),
  ('post_share_create', 30, 60),
  ('report_create', 5, 3600),
  ('block_create', 20, 3600)
on conflict (action_key) do update
set max_events = excluded.max_events,
    window_seconds = excluded.window_seconds;

create table if not exists private.user_rate_limits (
  user_id uuid not null references public.users(id) on delete cascade,
  action_key text not null references private.rate_limit_rules(action_key) on delete cascade,
  window_started_at timestamptz not null,
  event_count integer not null check (event_count > 0),
  primary key (user_id, action_key)
);

create index if not exists user_rate_limits_window_idx
  on private.user_rate_limits (window_started_at);

revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;

create or replace function private.enforce_user_rate_limit(p_action_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_limit integer;
  v_window interval;
  v_started_at timestamptz;
  v_count integer;
  v_inserted integer;
begin
  if v_user_id is null then
    return;
  end if;

  if public.is_trusted_server() then
    return;
  end if;

  select r.max_events, pg_catalog.make_interval(secs => r.window_seconds)
    into v_limit, v_window
  from private.rate_limit_rules r
  where r.action_key = p_action_key;

  if v_limit is null then
    raise exception 'Unknown rate-limit action: %', p_action_key;
  end if;

  insert into private.user_rate_limits (user_id, action_key, window_started_at, event_count)
  values (v_user_id, p_action_key, v_now, 1)
  on conflict (user_id, action_key) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    return;
  end if;

  select url.window_started_at, url.event_count
    into v_started_at, v_count
  from private.user_rate_limits url
  where url.user_id = v_user_id
    and url.action_key = p_action_key
  for update;

  if v_started_at <= v_now - v_window then
    update private.user_rate_limits
       set window_started_at = v_now,
           event_count = 1
     where user_id = v_user_id
       and action_key = p_action_key;
    return;
  end if;

  if v_count >= v_limit then
    raise exception 'Rate limit exceeded for %', p_action_key
      using errcode = 'P0001';
  end if;

  update private.user_rate_limits
     set event_count = v_count + 1
   where user_id = v_user_id
     and action_key = p_action_key;
end;
$$;

revoke all on function private.enforce_user_rate_limit(text) from public, anon, authenticated;

create or replace function private.enforce_social_mutation_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  case tg_table_name
    when 'posts' then perform private.enforce_user_rate_limit('post_create');
    when 'comments' then perform private.enforce_user_rate_limit('comment_create');
    when 'messages' then perform private.enforce_user_rate_limit('message_create');
    when 'follows' then perform private.enforce_user_rate_limit('follow_create');
    when 'post_likes' then perform private.enforce_user_rate_limit('post_like_create');
    when 'comment_likes' then perform private.enforce_user_rate_limit('comment_like_create');
    when 'post_shares' then perform private.enforce_user_rate_limit('post_share_create');
    when 'reports' then perform private.enforce_user_rate_limit('report_create');
    when 'blocks' then perform private.enforce_user_rate_limit('block_create');
    else
      raise exception 'Unhandled rate-limit trigger table: %', tg_table_name;
  end case;

  return new;
end;
$$;

revoke all on function private.enforce_social_mutation_rate_limit() from public, anon, authenticated;

drop trigger if exists trg_rate_limit_posts on public.posts;
create trigger trg_rate_limit_posts
before insert on public.posts
for each row execute function private.enforce_social_mutation_rate_limit();

drop trigger if exists trg_rate_limit_comments on public.comments;
create trigger trg_rate_limit_comments
before insert on public.comments
for each row execute function private.enforce_social_mutation_rate_limit();

drop trigger if exists trg_rate_limit_messages on public.messages;
create trigger trg_rate_limit_messages
before insert on public.messages
for each row execute function private.enforce_social_mutation_rate_limit();

drop trigger if exists trg_rate_limit_follows on public.follows;
create trigger trg_rate_limit_follows
before insert on public.follows
for each row execute function private.enforce_social_mutation_rate_limit();

drop trigger if exists trg_rate_limit_post_likes on public.post_likes;
create trigger trg_rate_limit_post_likes
before insert on public.post_likes
for each row execute function private.enforce_social_mutation_rate_limit();

drop trigger if exists trg_rate_limit_comment_likes on public.comment_likes;
create trigger trg_rate_limit_comment_likes
before insert on public.comment_likes
for each row execute function private.enforce_social_mutation_rate_limit();

drop trigger if exists trg_rate_limit_post_shares on public.post_shares;
create trigger trg_rate_limit_post_shares
before insert on public.post_shares
for each row execute function private.enforce_social_mutation_rate_limit();

drop trigger if exists trg_rate_limit_reports on public.reports;
create trigger trg_rate_limit_reports
before insert on public.reports
for each row execute function private.enforce_social_mutation_rate_limit();

drop trigger if exists trg_rate_limit_blocks on public.blocks;
create trigger trg_rate_limit_blocks
before insert on public.blocks
for each row execute function private.enforce_social_mutation_rate_limit();

commit;
