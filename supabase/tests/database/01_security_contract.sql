begin;

create extension if not exists pgtap;

select plan(29);

-- RLS must be enabled on every client-facing or sensitive table.
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='users'), 'users has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='profiles'), 'profiles has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='posts'), 'posts has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='post_media'), 'post_media has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='comments'), 'comments has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='messages'), 'messages has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='conversation_participants'), 'conversation participants has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='notifications'), 'notifications has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='reports'), 'reports has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='moderation_cases'), 'moderation cases has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='payments'), 'payments has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='purchases'), 'purchases has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='coin_wallets'), 'coin wallets have RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='financial_ledger_entries'), 'financial ledger has RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='refunds'), 'refunds have RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='product_fulfillment_rules'), 'fulfillment rules have RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='fulfillments'), 'fulfillments have RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='payment_webhook_events'), 'payment webhook events have RLS enabled');
select ok((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='hbc_recovery_obligations'), 'HBC recovery obligations have RLS enabled');

-- Sensitive server-owned tables intentionally expose no client policies.
select ok(not exists (select 1 from pg_policies where schemaname='public' and tablename in ('product_fulfillment_rules','fulfillments','payment_webhook_events','hbc_recovery_obligations') and roles::text ilike '%authenticated%'), 'server-owned financial/fulfillment tables have no authenticated policies');

-- Critical security helpers must be SECURITY DEFINER and pin search_path.
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='is_trusted_server' limit 1), 'is_trusted_server is SECURITY DEFINER');
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='send_message' limit 1), 'send_message is SECURITY DEFINER');
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='send_virtual_gift' limit 1), 'send_virtual_gift is SECURITY DEFINER');
select ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='apply_coin_wallet_transaction' limit 1), 'wallet transaction RPC is SECURITY DEFINER');

-- Critical functions must not expose a writable/default search_path.
select ok((select coalesce(p.proconfig::text,'') ilike '%search_path=pg_catalog, public%' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='send_message' limit 1), 'send_message pins search_path');
select ok((select coalesce(p.proconfig::text,'') ilike '%search_path=pg_catalog, public%' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='send_virtual_gift' limit 1), 'send_virtual_gift pins search_path');
select ok((select coalesce(p.proconfig::text,'') ilike '%search_path=pg_catalog, public%' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='apply_coin_wallet_transaction' limit 1), 'wallet transaction RPC pins search_path');

-- No legacy profile_visibility column should exist on profiles; privacy settings is canonical.
select ok(not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='profile_visibility'), 'profile visibility is not duplicated on profiles');

-- No local password storage should exist in the public user model.
select ok(not exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name in ('password','password_hash','encrypted_password')), 'users does not store passwords');

select * from finish();

rollback;
