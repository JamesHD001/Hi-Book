begin;

select plan(12);

select ok(exists (
  select 1 from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_moderation_case_from_report'
), 'report-to-case trigger function exists');

select ok(exists (
  select 1 from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  where c.relname = 'reports'
    and t.tgname = 'trg_create_moderation_case_from_report'
    and not t.tgisinternal
), 'reports create moderation case trigger exists');

select ok((select prosecdef
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_moderation_case_from_report'
  limit 1), 'report-to-case function is SECURITY DEFINER');

select ok((select 'search_path=""' = any(coalesce(p.proconfig, '{}'::text[]))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_moderation_case_from_report'
  limit 1), 'report-to-case function has an empty controlled search_path');

select is((select has_function_privilege('authenticated', p.oid, 'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_moderation_case_from_report'
  limit 1), false, 'report-to-case function cannot be called directly by authenticated users');

select ok((select prosecdef
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_moderation_queue'
  limit 1), 'get_moderation_queue is SECURITY DEFINER');

select ok((select 'search_path=""' = any(coalesce(p.proconfig, '{}'::text[]))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_moderation_queue'
  limit 1), 'get_moderation_queue has an empty controlled search_path');

select is((select has_function_privilege('public', p.oid, 'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_moderation_queue'
  limit 1), false, 'get_moderation_queue is not executable by PUBLIC');

select is((select has_function_privilege('anon', p.oid, 'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_moderation_queue'
  limit 1), false, 'get_moderation_queue is not executable by anon');

select ok((select has_function_privilege('authenticated', p.oid, 'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_moderation_queue'
  limit 1), 'authenticated can execute get_moderation_queue');

select ok((select prosecdef
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'assign_moderation_case'
  limit 1), 'assign_moderation_case is SECURITY DEFINER');

select ok((select 'search_path=""' = any(coalesce(p.proconfig, '{}'::text[]))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'assign_moderation_case'
  limit 1), 'assign_moderation_case has an empty controlled search_path');

select * from finish();
rollback;
