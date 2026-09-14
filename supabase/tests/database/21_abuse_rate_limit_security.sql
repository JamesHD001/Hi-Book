begin;

create extension if not exists pgtap;

select plan(19);

select ok((select to_regnamespace('private')) is not null, 'private schema exists for abuse-control state');
select ok((select count(*) from private.rate_limit_rules) = 9, 'all authenticated mutation rate-limit rules are registered');
select ok((select count(*) from private.user_rate_limits) = 0, 'rate-limit state starts empty for this rolled-back test');
select ok((select count(*)
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and t.tgname in (
      'trg_rate_limit_posts',
      'trg_rate_limit_comments',
      'trg_rate_limit_messages',
      'trg_rate_limit_follows',
      'trg_rate_limit_post_likes',
      'trg_rate_limit_comment_likes',
      'trg_rate_limit_post_shares',
      'trg_rate_limit_reports',
      'trg_rate_limit_blocks'
    )
    and not t.tgisinternal
) = 9, 'all high-volume authenticated mutation tables have rate-limit triggers');
select ok((select has_function_privilege('authenticated', 'private.enforce_user_rate_limit(text)', 'EXECUTE')) is false, 'rate-limit helper is not exposed to authenticated callers');
select ok((select has_function_privilege('anon', 'private.enforce_user_rate_limit(text)', 'EXECUTE')) is false, 'rate-limit helper is not exposed to anonymous callers');
select ok((select max_events from private.rate_limit_rules where action_key = 'post_create') = 20, 'post creation default is 20 events per minute');
select ok((select max_events from private.rate_limit_rules where action_key = 'comment_create') = 30, 'comment creation default is 30 events per minute');
select ok((select max_events from private.rate_limit_rules where action_key = 'message_create') = 60, 'message creation default is 60 events per minute');
select ok((select max_events from private.rate_limit_rules where action_key = 'follow_create') = 60, 'follow creation default is 60 events per minute');
select ok((select max_events from private.rate_limit_rules where action_key = 'report_create') = 5, 'report creation default is 5 events per hour');

select lives_ok($seed$
  insert into auth.users (id, aud, role, email, encrypted_password, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
  values (
    '00000000-0000-0000-0000-000000000021',
    'authenticated',
    'authenticated',
    'abuse-rate-test@example.test',
    'test-hash',
    '{"first_name":"Rate","last_name":"Tester","date_of_birth":"1990-01-01","gender":"UNDISCLOSED","country_code":"NG"}'::jsonb,
    now(), now(), now()
  )
$seed$, 'rate-limit test auth identity can be seeded');

set local role postgres;
update public.users
set account_status = 'ACTIVE'
where id = '00000000-0000-0000-0000-000000000021';
update private.rate_limit_rules
set max_events = 2
where action_key = 'post_create';
grant usage on schema private to authenticated;
grant execute on function private.enforce_user_rate_limit(text) to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000021', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok($limit_one$
  select private.enforce_user_rate_limit('post_create')
$limit_one$, 'first event inside the configured test limit succeeds');
select lives_ok($limit_two$
  select private.enforce_user_rate_limit('post_create')
$limit_two$, 'second event inside the configured test limit succeeds');
select throws_ok($limit_three$
  select private.enforce_user_rate_limit('post_create')
$limit_three$, 'P0001', null, 'third event is rejected by the database rate limit');

set local role postgres;
select ok((select count(*) from private.user_rate_limits
  where user_id = '00000000-0000-0000-0000-000000000021'
    and action_key = 'post_create'
    and event_count = 2) = 1, 'rejected event does not consume an additional rate-limit event');

update private.rate_limit_rules
set max_events = 20
where action_key = 'post_create';
set local role authenticated;

select lives_ok($post_trigger$
  select public.create_post(
    '21000000-0000-0000-0000-000000000001',
    'Rate-limit trigger integration test',
    'PUBLIC',
    '[]'::jsonb
  )
$post_trigger$, 'post creation trigger consumes a database rate-limit event');

set local role postgres;
select ok((select event_count from private.user_rate_limits
  where user_id = '00000000-0000-0000-0000-000000000021'
    and action_key = 'post_create') = 3, 'post trigger increments the same per-user rate-limit counter');
select ok((select count(*) from public.posts
  where id = '21000000-0000-0000-0000-000000000001') = 1, 'rate-limited post is created when under the configured limit');

select * from finish();

rollback;
