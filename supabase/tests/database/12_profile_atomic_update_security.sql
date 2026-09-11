begin;

create extension if not exists pgtap;

select plan(6);

select ok(exists (
  select 1
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'update_profile_atomic'
), 'update_profile_atomic RPC exists');

select ok((select prosecdef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'update_profile_atomic'
  limit 1), 'update_profile_atomic is SECURITY DEFINER');

select ok((select 'search_path=""' = any(coalesce(p.proconfig, '{}'::text[]))
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'update_profile_atomic'
  limit 1), 'update_profile_atomic has an empty controlled search_path');

select is((select has_function_privilege('public', p.oid, 'EXECUTE')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'update_profile_atomic'
  limit 1), false, 'update_profile_atomic is not executable by PUBLIC');

select is((select has_function_privilege('anon', p.oid, 'EXECUTE')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'update_profile_atomic'
  limit 1), false, 'update_profile_atomic is not executable by anon');

select ok((select has_function_privilege('authenticated', p.oid, 'EXECUTE')
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'update_profile_atomic'
  limit 1), 'authenticated can execute update_profile_atomic');

select * from finish();
rollback;
