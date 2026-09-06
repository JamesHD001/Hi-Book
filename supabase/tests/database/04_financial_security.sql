begin;

create extension if not exists pgtap;

select plan(30);

-- ============================================================
-- TEST FIXTURES
-- ============================================================

select lives_ok($seed_auth$
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values
    ('40000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'finance-alice@example.test', 'test-hash', now(), now(), now()),
    ('40000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'finance-bob@example.test', 'test-hash', now(), now()),
    ('40000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'finance-cara@example.test', 'test-hash', now(), now())
$seed_auth$, 'financial test auth identities can be seeded');

insert into public.users (id, first_name, last_name, date_of_birth, gender, country_code, account_status)
values
  ('40000000-0000-0000-0000-000000000011', 'Finance', 'Alice', '1990-01-01', 'FEMALE', 'NG', 'ACTIVE'),
  ('40000000-0000-0000-0000-000000000012', 'Finance', 'Bob', '1990-01-02', 'MALE', 'US', 'ACTIVE'),
  ('40000000-0000-0000-0000-000000000013', 'Finance', 'Cara', '1990-01-03', 'UNDISCLOSED', 'GB', 'ACTIVE');

insert into public.profiles (user_id, username, username_normalized, display_name)
values
  ('40000000-0000-0000-0000-000000000011', 'finance_alice', 'finance_alice', 'Alice'),
  ('40000000-0000-0000-0000-000000000012', 'finance_bob', 'finance_bob', 'Bob'),
  ('40000000-0000-0000-0000-000000000013', 'finance_cara', 'finance_cara', 'Cara');

insert into public.user_privacy_settings (user_id, profile_visibility, country_visibility, message_permission)
values
  ('40000000-0000-0000-0000-000000000011', 'PUBLIC', 'PUBLIC', 'EVERYONE'),
  ('40000000-0000-0000-0000-000000000012', 'PUBLIC', 'PUBLIC', 'EVERYONE'),
  ('40000000-0000-0000-0000-000000000013', 'PUBLIC', 'PUBLIC', 'EVERYONE');

insert into public.currencies (id, code, name, currency_type, decimal_places, is_active)
values
  ('41000000-0000-0000-0000-000000000001', 'HBC', 'Hi!Book Coin', 'VIRTUAL', 0, true),
  ('41000000-0000-0000-0000-000000000002', 'NGN', 'Nigerian Naira', 'FIAT', 2, true);

insert into public.coin_wallets (id, user_id, currency_id, available_balance, status)
values
  ('42000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000011', '41000000-0000-0000-0000-000000000001', 0, 'ACTIVE'),
  ('42000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000012', '41000000-0000-0000-0000-000000000001', 0, 'ACTIVE');

insert into public.virtual_gifts (id, gift_key, name, description, hbc_price, is_active)
values ('43000000-0000-0000-0000-000000000001', 'finance-heart', 'Finance Heart', 'Security test gift', 100, true);

insert into public.payment_providers (id, provider_key, name, is_active)
values ('44000000-0000-0000-0000-000000000001', 'finance-test-provider', 'Financial Test Provider', true);

insert into public.monetization_products (id, product_key, name, description, product_type, fulfillment_type, is_active)
values ('45000000-0000-0000-0000-000000000001', 'finance-hbc-pack', 'Finance HBC Pack', 'Security test HBC package', 'COIN_PACKAGE', 'HBC_CREDIT', true);

insert into public.product_prices (id, product_id, currency_id, unit_amount, effective_from, is_active)
values ('46000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000002', 1000, now(), true);

insert into public.product_fulfillment_rules (id, product_id, fulfillment_type, currency_id, fulfillment_quantity, is_active)
values ('47000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000001', 'HBC_CREDIT', '41000000-0000-0000-0000-000000000001', 1000, true);

insert into public.financial_accounts (id, account_code, account_name, account_type, currency_id, status)
values
  ('48000000-0000-0000-0000-000000000001', 'FINANCE_CASH', 'Finance Test Cash', 'ASSET', '41000000-0000-0000-0000-000000000002', 'ACTIVE'),
  ('48000000-0000-0000-0000-000000000002', 'FINANCE_REVENUE', 'Finance Test Revenue', 'REVENUE', '41000000-0000-0000-0000-000000000002', 'ACTIVE');

insert into public.purchases (id, user_id, product_id, product_price_id, quantity, currency_id, unit_amount, total_amount, status)
values ('49000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000012', '45000000-0000-0000-0000-000000000001', '46000000-0000-0000-0000-000000000001', 1, '41000000-0000-0000-0000-000000000002', 1000, 1000, 'PENDING_PAYMENT');

insert into public.payments (id, purchase_id, user_id, provider_id, currency_id, amount, provider_reference, status)
values ('4a000000-0000-0000-0000-000000000001', '49000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000012', '44000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000002', 1000, 'finance-provider-ref-1', 'INITIATED');

-- ============================================================
-- 1. CLIENT FINANCIAL WRITE BOUNDARY
-- ============================================================

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000011', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select throws_ok($wallet_read$
  select available_balance from public.coin_wallets where id = '42000000-0000-0000-0000-000000000012'
$wallet_read$, '42501', null, 'authenticated users cannot read another user wallet');

select throws_ok($wallet_write$
  update public.coin_wallets set available_balance = 999999 where id = '42000000-0000-0000-0000-000000000011'
$wallet_write$, '42501', null, 'authenticated users cannot directly modify wallet balances');

select throws_ok($ledger_write$
  insert into public.financial_ledger_entries (transaction_group_id, account_id, currency_id, direction, amount, occurred_at)
  values ('4b000000-0000-0000-0000-000000000001', '48000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000002', 'DEBIT', 100, now())
$ledger_write$, '42501', null, 'authenticated users cannot directly write financial ledger entries');

select throws_ok($gift_write$
  insert into public.gift_transactions (gift_id, sender_id, recipient_id, quantity, unit_price_hbc, total_hbc, status)
  values ('43000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000012', 1, 1, 1, 'COMPLETED')
$gift_write$, '42501', null, 'authenticated users cannot inject gift prices or transactions');

select throws_ok($refund_write$
  insert into public.refunds (payment_id, purchase_id, amount, currency_id, status)
  values ('4a000000-0000-0000-0000-000000000001', '49000000-0000-0000-0000-000000000001', 1, '41000000-0000-0000-0000-000000000002', 'REQUESTED')
$refund_write$, '42501', null, 'authenticated users cannot directly create refunds');

select throws_ok($admin_role_write$
  insert into public.admin_user_roles (user_id, role_id) values ('40000000-0000-0000-0000-000000000011', gen_random_uuid())
$admin_role_write$, '42501', null, 'authenticated users cannot escalate themselves through admin role records');

-- ============================================================
-- 2. SERVER-SIDE WALLET ATOMICITY / IDEMPOTENCY
-- ============================================================

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);

select lives_ok($credit$
  select public.credit_coin_wallet('40000000-0000-0000-0000-000000000011', '41000000-0000-0000-0000-000000000001', 1000, 'finance-credit-1', 'TEST', '4c000000-0000-0000-0000-000000000001', 'Initial HBC test credit')
$credit$, 'trusted server can credit a wallet atomically');

select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000011'), 1000::bigint, 'wallet balance reflects exactly one credit');

select is(
  (select public.credit_coin_wallet('40000000-0000-0000-0000-000000000011', '41000000-0000-0000-0000-000000000001', 1000, 'finance-credit-1', 'TEST', '4c000000-0000-0000-0000-000000000001', 'Retry')), 
  (select id from public.coin_transactions where wallet_id='42000000-0000-0000-0000-000000000011' and idempotency_key='finance-credit-1'),
  'replaying the same wallet credit returns the original transaction'
);

select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000011'), 1000::bigint, 'idempotent credit does not double-credit the wallet');

select throws_ok($negative_debit$
  select public.debit_coin_wallet('40000000-0000-0000-0000-000000000011', '41000000-0000-0000-0000-000000000001', 1001, 'finance-debit-too-large')
$negative_debit$, 'P0001', null, 'debit larger than available HBC is rejected without overdraft');

select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000011'), 1000::bigint, 'failed debit leaves wallet balance unchanged');

update public.coin_wallets set status='FROZEN' where id='42000000-0000-0000-0000-000000000011';
select throws_ok($frozen_wallet$
  select public.debit_coin_wallet('40000000-0000-0000-0000-000000000011', '41000000-0000-0000-0000-000000000001', 1, 'finance-frozen-debit')
$frozen_wallet$, 'P0001', null, 'frozen wallet rejects mutations');
update public.coin_wallets set status='ACTIVE' where id='42000000-0000-0000-0000-000000000011';

-- ============================================================
-- 3. GIFT SECURITY / CLOSED-LOOP HBC
-- ============================================================

select lives_ok($gift_send$
  select public.send_virtual_gift('40000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000012', '43000000-0000-0000-0000-000000000001', 2, 'finance-gift-1', 'Hello')
$gift_send$, 'trusted server can execute a gift purchase using authoritative gift price');

select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000011'), 800::bigint, 'gift debit removes the authoritative 200 HBC price');
select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000012'), 0::bigint, 'gift recipient does not receive spendable HBC');

select is(
  (select public.send_virtual_gift('40000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000012', '43000000-0000-0000-0000-000000000001', 2, 'finance-gift-1', 'Retry')),
  (select id from public.gift_transactions where sender_id='40000000-0000-0000-0000-000000000011' and idempotency_key='finance-gift-1'),
  'replaying a gift idempotency key returns the original gift transaction'
);

select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000011'), 800::bigint, 'gift replay does not double-debit HBC');

insert into public.blocks (blocker_id, blocked_id) values ('40000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000011');
select throws_ok($blocked_gift$
  select public.send_virtual_gift('40000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000012', '43000000-0000-0000-0000-000000000001', 1, 'finance-gift-blocked')
$blocked_gift$, 'P0001', null, 'gift sending is blocked in either block direction');
delete from public.blocks where blocker_id='40000000-0000-0000-0000-000000000012' and blocked_id='40000000-0000-0000-0000-000000000011';

-- ============================================================
-- 4. DOUBLE-ENTRY LEDGER INTEGRITY
-- ============================================================

select lives_ok($post_ledger$
  select public.post_financial_transaction(
    '41000000-0000-0000-0000-000000000002',
    jsonb_build_array(
      jsonb_build_object('account_id','48000000-0000-0000-0000-000000000001','direction','DEBIT','amount',1000),
      jsonb_build_object('account_id','48000000-0000-0000-0000-000000000002','direction','CREDIT','amount',1000)
    ),
    'TEST', '4d000000-0000-0000-0000-000000000001', now(), 'Balanced finance test'
  )
$post_ledger$, 'trusted server can post a balanced double-entry transaction');

select ok(
  exists (
    select 1 from (
      select transaction_group_id,
             sum(case when direction='DEBIT' then amount else 0 end) debits,
             sum(case when direction='CREDIT' then amount else 0 end) credits,
             count(*) entries
      from public.financial_ledger_entries
      where reference_type='TEST' and reference_id='4d000000-0000-0000-0000-000000000001'
      group by transaction_group_id
    ) x where x.entries >= 2 and x.debits = x.credits
  ),
  'posted financial transaction is balanced with at least two entries'
);

select throws_ok($unbalanced$
  select public.post_financial_transaction(
    '41000000-0000-0000-0000-000000000002',
    jsonb_build_array(
      jsonb_build_object('account_id','48000000-0000-0000-0000-000000000001','direction','DEBIT','amount',1000),
      jsonb_build_object('account_id','48000000-0000-0000-0000-000000000002','direction','CREDIT','amount',999)
    )
  )
$unbalanced$, 'P0001', null, 'unbalanced financial transaction cannot be posted');

select ok(
  (select count(*) from public.financial_ledger_entries where reference_type='TEST' and reference_id='4d000000-0000-0000-0000-000000000001') = 2,
  'ledger contains exactly the original two entries before reversal'
);

select lives_ok($reverse$
  select public.reverse_financial_transaction(
    (select transaction_group_id from public.financial_ledger_entries where reference_type='TEST' and reference_id='4d000000-0000-0000-0000-000000000001' limit 1),
    'Finance test reversal'
  )
$reverse$, 'trusted server can reverse a posted transaction with a complete opposite transaction');

select ok(
  (select count(*) from public.financial_ledger_entries where reference_type='LEDGER_REVERSAL' and reference_id in (select id from public.financial_ledger_entries where reference_type='TEST' and reference_id='4d000000-0000-0000-0000-000000000001')) = 2,
  'ledger reversal creates one opposite entry for each original entry'
);

select throws_ok($ledger_update$
  update public.financial_ledger_entries set amount=2000
  where reference_type='TEST' and reference_id='4d000000-0000-0000-0000-000000000001'
$ledger_update$, 'P0001', null, 'posted ledger entries are immutable');

-- ============================================================
-- 5. PAYMENT VERIFICATION / WEBHOOK IDEMPOTENCY
-- ============================================================

select throws_ok($bad_payment$
  select public.record_verified_payment('4a000000-0000-0000-0000-000000000001', 'finance-provider-ref-1', 999, '41000000-0000-0000-0000-000000000002', 'SUCCEEDED')
$bad_payment$, 'P0001', null, 'verified payment cannot accept a client/provider amount mismatch');

select lives_ok($good_payment$
  select public.record_verified_payment('4a000000-0000-0000-0000-000000000001', 'finance-provider-ref-1', 1000, '41000000-0000-0000-0000-000000000002', 'SUCCEEDED')
$good_payment$, 'server can record a provider-verified payment with matching immutable values');

select is((select status::text from public.payments where id='4a000000-0000-0000-0000-000000000001'), 'SUCCEEDED', 'verified payment becomes SUCCEEDED');
select is((select status::text from public.purchases where id='49000000-0000-0000-0000-000000000001'), 'PAID', 'successful payment transitions purchase to PAID');

select lives_ok($duplicate_payment$
  select public.record_verified_payment('4a000000-0000-0000-0000-000000000001', 'finance-provider-ref-1', 1000, '41000000-0000-0000-0000-000000000002', 'SUCCEEDED')
$duplicate_payment$, 'duplicate successful payment verification is idempotent');

select is((select count(*) from public.payment_webhook_events), 0::bigint, 'no webhook event is created merely by direct payment verification');

select is(
  (select public.record_payment_webhook_event('44000000-0000-0000-0000-000000000001','finance-event-1','charge.succeeded','finance-provider-ref-1','{"test":true}'::jsonb)),
  (select public.record_payment_webhook_event('44000000-0000-0000-0000-000000000001','finance-event-1','charge.succeeded','finance-provider-ref-1','{"test":false}'::jsonb)),
  'duplicate provider webhook event ID returns the original event and prevents duplicate ingestion'
);

-- ============================================================
-- 6. HBC FULFILLMENT + REFUND RECOVERY
-- ============================================================

select lives_ok($fulfill$
  select public.fulfill_hbc_purchase('49000000-0000-0000-0000-000000000001','finance-fulfillment-1')
$fulfill$, 'verified paid HBC purchase can be fulfilled server-side');

select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000012'), 1000::bigint, 'HBC fulfillment credits the exact authoritative quantity');
select is((select status from public.purchases where id='49000000-0000-0000-0000-000000000001'), 'FULFILLED'::purchase_status, 'successful HBC fulfillment transitions purchase to FULFILLED');

select is(
  (select public.fulfill_hbc_purchase('49000000-0000-0000-0000-000000000001','finance-fulfillment-retry')),
  (select id from public.fulfillments where purchase_id='49000000-0000-0000-0000-000000000001'),
  'replaying a completed fulfillment is idempotent'
);

select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000012'), 1000::bigint, 'fulfillment replay does not duplicate HBC credit');

select lives_ok($refund_request$
  select public.request_refund('4a000000-0000-0000-0000-000000000001',1000,'41000000-0000-0000-0000-000000000002','Full HBC refund test')
$refund_request$, 'server can request a full refund for the verified payment');

select lives_ok($refund_complete$
  select public.complete_refund((select id from public.refunds where payment_id='4a000000-0000-0000-0000-000000000001' order by created_at desc limit 1),'finance-refund-provider-1')
$refund_complete$, 'full HBC refund completes only through the server refund workflow');

select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000012'), 0::bigint, 'full HBC refund removes the previously fulfilled unspent HBC');
select is((select reversed_quantity from public.fulfillments where purchase_id='49000000-0000-0000-0000-000000000001'), 1000::bigint, 'refund reversal records the exact HBC quantity recovered');

select * from finish();

rollback;
