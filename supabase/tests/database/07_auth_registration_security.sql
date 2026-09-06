begin;

select plan(13);

select ok(exists (select 1 from pg_trigger where tgname = 'on_auth_user_created'), 'auth user registration trigger exists');
select ok((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'handle_auth_user_created'), 'registration trigger function is SECURITY DEFINER');
select ok((select position('set search_path = ' in pg_get_functiondef(p.oid)) > 0 and position('set search_path = '';' in pg_get_functiondef(p.oid)) > 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'handle_auth_user_created'), 'registration trigger has empty controlled search_path');
select is((select has_function_privilege('public', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'handle_auth_user_created' limit 1), false, 'registration trigger is not executable by PUBLIC');

select ok(exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'complete_registration'), 'complete_registration RPC exists');
select ok((select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'complete_registration'), 'complete_registration is SECURITY DEFINER');
select ok((select position('set search_path = ' in pg_get_functiondef(p.oid)) > 0 and position('set search_path = '';' in pg_get_functiondef(p.oid)) > 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'complete_registration'), 'complete_registration has empty controlled search_path');
select is((select has_function_privilege('public', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'complete_registration' limit 1), false, 'complete_registration is not executable by PUBLIC');
select is((select has_function_privilege('anon', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'complete_registration' limit 1), false, 'complete_registration is not executable by anon');
select ok((select has_function_privilege('authenticated', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'complete_registration' limit 1), 'authenticated can execute complete_registration');

select is((select has_column_privilege('authenticated', 'public.users', 'country_code', 'UPDATE')), true, 'authenticated can update country_code');
select is((select has_column_privilege('authenticated', 'public.users', 'account_status', 'UPDATE')), false, 'authenticated cannot update account_status directly');

select ok(exists (select 1 from public.legal_document where document_type = 'TERMS_OF_USE' and version = '1.0' and published_at is not null), 'initial Terms of Use document is registered');

select * from finish();
rollback;
