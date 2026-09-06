begin;

select plan(24);

-- ============================================================
-- FINAL CROSS-DOMAIN SECURITY CONTRACT
-- ============================================================

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'product_fulfillment_rules'),
  'product_fulfillment_rules has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'fulfillments'),
  'fulfillments has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'payment_webhook_events'),
  'payment_webhook_events has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'hbc_recovery_obligations'),
  'hbc_recovery_obligations has RLS enabled'
);

-- These late-added server-owned tables must not expose authenticated write/read policies.
select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'product_fulfillment_rules' and roles @> array['authenticated']::name[]),
  0,
  'product_fulfillment_rules has no authenticated client policies'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'fulfillments' and roles @> array['authenticated']::name[]),
  0,
  'fulfillments has no authenticated client policies'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'payment_webhook_events' and roles @> array['authenticated']::name[]),
  0,
  'payment_webhook_events has no authenticated client policies'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and tablename = 'hbc_recovery_obligations' and roles @> array['authenticated']::name[]),
  0,
  'hbc_recovery_obligations has no authenticated client policies'
);

-- Required cross-domain validation triggers.
select ok(
  exists (select 1 from pg_trigger where tgname = 'trg_validate_hbc_recovery_cross_domain'),
  'HBC recovery cross-domain trigger exists'
);

select ok(
  exists (select 1 from pg_trigger where tgname = 'trg_hbc_recovery_obligations_updated_at'),
  'HBC recovery updated_at trigger exists'
);

select ok(
  exists (select 1 from pg_trigger where tgname = 'trg_validate_payment_purchase_identity'),
  'payment purchase identity trigger exists'
);

select ok(
  exists (select 1 from pg_trigger where tgname = 'trg_validate_payment_attempt_consistency'),
  'payment attempt consistency trigger exists'
);

select ok(
  exists (select 1 from pg_trigger where tgname = 'trg_validate_fulfillment_user_consistency'),
  'fulfillment identity trigger exists'
);

select ok(
  exists (select 1 from pg_trigger where tgname = 'trg_validate_payment_webhook_event'),
  'payment webhook validation trigger exists'
);

-- Trigger functions must use a controlled search_path.
select ok(
  (select proconfig @> array['search_path=pg_catalog, public'] from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_hbc_recovery_cross_domain'),
  'HBC recovery validator has controlled search_path'
);

select ok(
  (select proconfig @> array['search_path=pg_catalog, public'] from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_payment_purchase_identity'),
  'payment identity validator has controlled search_path'
);

select ok(
  (select proconfig @> array['search_path=pg_catalog, public'] from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_payment_attempt_consistency'),
  'payment attempt validator has controlled search_path'
);

select ok(
  (select proconfig @> array['search_path=pg_catalog, public'] from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_fulfillment_user_consistency'),
  'fulfillment validator has controlled search_path'
);

select ok(
  (select proconfig @> array['search_path=pg_catalog, public'] from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_payment_webhook_event'),
  'webhook validator has controlled search_path'
);

-- Validate function security posture and prevent accidental public execution.
select ok(
  (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_hbc_recovery_cross_domain'),
  'HBC recovery validator is SECURITY DEFINER'
);

select ok(
  (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_payment_purchase_identity'),
  'payment identity validator is SECURITY DEFINER'
);

select ok(
  (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_payment_attempt_consistency'),
  'payment attempt validator is SECURITY DEFINER'
);

select ok(
  (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_fulfillment_user_consistency'),
  'fulfillment validator is SECURITY DEFINER'
);

select ok(
  (select prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_payment_webhook_event'),
  'webhook validator is SECURITY DEFINER'
);

select is(
  (select has_function_privilege('public', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_payment_webhook_event' limit 1),
  false,
  'webhook validator is not executable by PUBLIC'
);

select is(
  (select has_function_privilege('public', p.oid, 'EXECUTE') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'validate_hbc_recovery_cross_domain' limit 1),
  false,
  'HBC recovery validator is not executable by PUBLIC'
);

select * from finish();
rollback;
