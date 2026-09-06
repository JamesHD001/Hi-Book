begin;

select plan(7);

select ok(exists (
  select 1 from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'discover_people'
), 'discover_people RPC exists');

select ok((select prosecdef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'discover_people'
  limit 1), 'discover_people is SECURITY DEFINER');

select ok((select 'search_path=""' = any(coalesce(p.proconfig, '{}'::text[]))
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'discover_people'
  limit 1), 'discover_people has an empty controlled search_path');

select is((select has_function_privilege('public', p.oid, 'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'discover_people'
  limit 1), false, 'discover_people is not executable by PUBLIC');

select is((select has_function_privilege('anon', p.oid, 'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'discover_people'
  limit 1), false, 'discover_people is not executable by anon');

select ok((select has_function_privilege('authenticated', p.oid, 'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'discover_people'
  limit 1), 'authenticated can execute discover_people');

select is((select pg_get_function_result(p.oid)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'discover_people'
  limit 1), 'TABLE(user_id uuid, username character varying, display_name character varying, bio text, avatar_path text, country_code character, shared_interest_count bigint, shared_language_count bigint)', 'discover_people exposes only approved public discovery fields');

select * from finish();
rollback;
