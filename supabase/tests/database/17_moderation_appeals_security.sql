begin;

select plan(10);

select ok(exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_moderation_appeal_queue'
), 'appeal queue RPC exists');

select ok(exists (
  select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_moderation_appeal'
), 'appeal detail RPC exists');

select ok((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_moderation_appeal_queue' limit 1),
  'appeal queue is SECURITY DEFINER');

select ok((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_moderation_appeal' limit 1),
  'appeal detail is SECURITY DEFINER');

select ok((select 'search_path=""' = any(coalesce(p.proconfig, '{}'::text[]))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'is_user_restricted' limit 1),
  'restriction helper has empty controlled search_path');

select is((select has_function_privilege('public', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_moderation_appeal_queue' limit 1), false,
  'appeal queue is not executable by PUBLIC');

select is((select has_function_privilege('anon', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_moderation_appeal_queue' limit 1), false,
  'appeal queue is not executable by anon');

select ok((select has_function_privilege('authenticated', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_moderation_appeal_queue' limit 1),
  'authenticated can execute appeal queue');

select is((select has_function_privilege('public', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'review_moderation_appeal' limit 1), false,
  'appeal review is not executable by PUBLIC');

select ok((select 'search_path=""' = any(coalesce(p.proconfig, '{}'::text[])) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'review_moderation_appeal' limit 1),
  'appeal review has empty controlled search_path');

select * from finish();
rollback;
