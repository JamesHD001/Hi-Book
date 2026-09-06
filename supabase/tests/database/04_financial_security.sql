begin;
create extension if not exists pgtap;
select plan(43);

-- Deterministic financial fixtures.
insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('40000000-0000-0000-0000-000000000011','authenticated','authenticated','finance-alice@example.test','test-hash',now(),now(),now()),
('40000000-0000-0000-0000-000000000012','authenticated','authenticated','finance-bob@example.test','test-hash',now(),now(),now()),
('40000000-0000-0000-0000-000000000013','authenticated','authenticated','finance-cara@example.test','test-hash',now(),now(),now());
insert into public.users(id,first_name,last_name,date_of_birth,gender,country_code,account_status) values
('40000000-0000-0000-0000-000000000011','Finance','Alice','1990-01-01','FEMALE','NG','ACTIVE'),
('40000000-0000-0000-0000-000000000012','Finance','Bob','1990-01-02','MALE','US','ACTIVE'),
('40000000-0000-0000-0000-000000000013','Finance','Cara','1990-01-03','UNDISCLOSED','GB','ACTIVE');
insert into public.profiles(user_id,username,username_normalized,display_name) values
('40000000-0000-0000-0000-000000000011','finance_alice','finance_alice','Alice'),
('40000000-0000-0000-0000-000000000012','finance_bob','finance_bob','Bob'),
('40000000-0000-0000-0000-000000000013','finance_cara','finance_cara','Cara');
insert into public.user_privacy_settings(user_id,profile_visibility,country_visibility,message_permission) values
('40000000-0000-0000-0000-000000000011','PUBLIC','PUBLIC','EVERYONE'),
('40000000-0000-0000-0000-000000000012','PUBLIC','PUBLIC','EVERYONE'),
('40000000-0000-0000-0000-000000000013','PUBLIC','PUBLIC','EVERYONE');
insert into public.currencies(id,code,name,currency_type,decimal_places,is_active) values
('41000000-0000-0000-0000-000000000001','HBC','Hi!Book Coin','VIRTUAL',0,true),
('41000000-0000-0000-0000-000000000002','NGN','Nigerian Naira','FIAT',2,true);
insert into public.coin_wallets(id,user_id,currency_id,available_balance,status) values
('42000000-0000-0000-0000-000000000011','40000000-0000-0000-0000-000000000011','41000000-0000-0000-0000-000000000001',0,'ACTIVE'),
('42000000-0000-0000-0000-000000000012','40000000-0000-0000-0000-000000000012','41000000-0000-0000-0000-000000000001',0,'ACTIVE');
insert into public.virtual_gifts(id,gift_key,name,description,hbc_price,is_active) values
('43000000-0000-0000-0000-000000000001','finance-heart','Finance Heart','Security test gift',100,true);
insert into public.payment_providers(id,provider_key,name,is_active) values
('44000000-0000-0000-0000-000000000001','finance-test-provider','Financial Test Provider',true);
insert into public.monetization_products(id,product_key,name,description,product_type,fulfillment_type,is_active) values
('45000000-0000-0000-0000-000000000001','finance-hbc-pack','Finance HBC Pack','Security test HBC package','COIN_PACKAGE','HBC_CREDIT',true);
insert into public.product_prices(id,product_id,currency_id,unit_amount,effective_from,is_active) values
('46000000-0000-0000-0000-000000000001','45000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000002',1000,now(),true);
insert into public.product_fulfillment_rules(id,product_id,fulfillment_type,currency_id,fulfillment_quantity,is_active) values
('47000000-0000-0000-0000-000000000001','45000000-0000-0000-0000-000000000001','HBC_CREDIT','41000000-0000-0000-0000-000000000001',1000,true);
insert into public.financial_accounts(id,account_code,account_name,account_type,currency_id,status) values
('48000000-0000-0000-0000-000000000001','FINANCE_CASH','Finance Test Cash','ASSET','41000000-0000-0000-0000-000000000002','ACTIVE'),
('48000000-0000-0000-0000-000000000002','FINANCE_REVENUE','Finance Test Revenue','REVENUE','41000000-0000-0000-0000-000000000002','ACTIVE');
insert into public.purchases(id,user_id,product_id,product_price_id,quantity,currency_id,unit_amount,total_amount,status) values
('49000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000012','45000000-0000-0000-0000-000000000001','46000000-0000-0000-0000-000000000001',1,'41000000-0000-0000-0000-000000000002',1000,1000,'PENDING_PAYMENT');
insert into public.payments(id,purchase_id,user_id,provider_id,currency_id,amount,provider_reference,status) values
('4a000000-0000-0000-0000-000000000001','49000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000012','44000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000002',1000,'finance-provider-ref-1','INITIATED');

-- 1-6: ordinary clients cannot access or mutate financial state.
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-0000-0000-000000000011',true);
select set_config('request.jwt.claim.role','authenticated',true);
select throws_ok($a$ select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000012' $a$,'42501',null,'authenticated users cannot read another wallet');
select throws_ok($b$ update public.coin_wallets set available_balance=999999 where id='42000000-0000-0000-0000-000000000011' $b$,'42501',null,'authenticated users cannot modify wallet balances');
select throws_ok($c$ insert into public.financial_ledger_entries(transaction_group_id,account_id,currency_id,direction,amount,occurred_at) values(gen_random_uuid(),'48000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000002','DEBIT',100,now()) $c$,'42501',null,'authenticated users cannot write financial ledger entries');
select throws_ok($d$ insert into public.gift_transactions(gift_id,sender_id,recipient_id,quantity,unit_price_hbc,total_hbc,status) values('43000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000011','40000000-0000-0000-0000-000000000012',1,1,1,'COMPLETED') $d$,'42501',null,'authenticated users cannot inject gift economics');
select throws_ok($e$ insert into public.refunds(payment_id,purchase_id,amount,currency_id,status) values('4a000000-0000-0000-0000-000000000001','49000000-0000-0000-0000-000000000001',1,'41000000-0000-0000-0000-000000000002','REQUESTED') $e$,'42501',null,'authenticated users cannot create refunds directly');
select throws_ok($f$ insert into public.admin_user_roles(user_id,role_id) values('40000000-0000-0000-0000-000000000011',gen_random_uuid()) $f$,'42501',null,'authenticated users cannot escalate through admin roles');

-- 7-14: atomic wallet operations.
set local role service_role;
select set_config('request.jwt.claim.role','service_role',true);
select lives_ok($g$ select public.credit_coin_wallet('40000000-0000-0000-0000-000000000011','41000000-0000-0000-0000-000000000001',1000,'finance-credit-1','TEST','4c000000-0000-0000-0000-000000000001','Initial credit') $g$,'trusted server can credit wallet');
select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000011'),1000::bigint,'wallet balance reflects one credit');
select is((select public.credit_coin_wallet('40000000-0000-0000-0000-000000000011','41000000-0000-0000-0000-000000000001',1000,'finance-credit-1','TEST','4c000000-0000-0000-0000-000000000001','Retry')),(select id from public.coin_transactions where wallet_id='42000000-0000-0000-0000-000000000011' and idempotency_key='finance-credit-1'),'wallet credit is idempotent');
select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000011'),1000::bigint,'idempotent credit does not double-credit');
select throws_ok($h$ select public.debit_coin_wallet('40000000-0000-0000-0000-000000000011','41000000-0000-0000-0000-000000000001',1001,'finance-too-large') $h$,'P0001',null,'insufficient HBC cannot overdraft wallet');
select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000011'),1000::bigint,'failed debit leaves balance unchanged');
update public.coin_wallets set status='FROZEN' where id='42000000-0000-0000-0000-000000000011';
select throws_ok($i$ select public.debit_coin_wallet('40000000-0000-0000-0000-000000000011','41000000-0000-0000-0000-000000000001',1,'finance-frozen') $i$,'P0001',null,'frozen wallet rejects mutation');
update public.coin_wallets set status='ACTIVE' where id='42000000-0000-0000-0000-000000000011';
select ok((select count(*) from public.coin_transaction_entries cte join public.coin_transactions ct on ct.id=cte.coin_transaction_id where ct.idempotency_key='finance-credit-1')=2,'wallet movement has balanced user/platform entries');

-- 15-20: gifts use authoritative price, block barrier, and no recipient HBC.
select lives_ok($j$ select public.send_virtual_gift('40000000-0000-0000-0000-000000000011','40000000-0000-0000-0000-000000000012','43000000-0000-0000-0000-000000000001',2,'finance-gift-1','Hello') $j$,'gift transaction succeeds server-side');
select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000011'),800::bigint,'gift debits authoritative 200 HBC');
select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000012'),0::bigint,'gift recipient receives no spendable HBC');
select is((select public.send_virtual_gift('40000000-0000-0000-0000-000000000011','40000000-0000-0000-0000-000000000012','43000000-0000-0000-0000-000000000001',2,'finance-gift-1','Retry')),(select id from public.gift_transactions where sender_id='40000000-0000-0000-0000-000000000011' and idempotency_key='finance-gift-1'),'gift replay is idempotent');
select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000011'),800::bigint,'gift replay does not double-debit');
insert into public.blocks(blocker_id,blocked_id) values('40000000-0000-0000-0000-000000000012','40000000-0000-0000-0000-000000000011');
select throws_ok($k$ select public.send_virtual_gift('40000000-0000-0000-0000-000000000011','40000000-0000-0000-0000-000000000012','43000000-0000-0000-0000-000000000001',1,'finance-gift-blocked') $k$,'P0001',null,'gift cannot cross a block barrier');
delete from public.blocks where blocker_id='40000000-0000-0000-0000-000000000012' and blocked_id='40000000-0000-0000-0000-000000000011';

-- 21-27: double-entry ledger and immutability.
select lives_ok($l$ select public.post_financial_transaction('41000000-0000-0000-0000-000000000002',jsonb_build_array(jsonb_build_object('account_id','48000000-0000-0000-0000-000000000001','direction','DEBIT','amount',1000),jsonb_build_object('account_id','48000000-0000-0000-0000-000000000002','direction','CREDIT','amount',1000)),'TEST','4d000000-0000-0000-0000-000000000001',now(),'Balanced test') $l$,'balanced ledger transaction can be posted');
select ok((select sum(case when direction='DEBIT' then amount else 0 end)=sum(case when direction='CREDIT' then amount else 0 end) from public.financial_ledger_entries where reference_type='TEST' and reference_id='4d000000-0000-0000-0000-000000000001'),'ledger debits equal credits');
select throws_ok($m$ select public.post_financial_transaction('41000000-0000-0000-0000-000000000002',jsonb_build_array(jsonb_build_object('account_id','48000000-0000-0000-0000-000000000001','direction','DEBIT','amount',1000),jsonb_build_object('account_id','48000000-0000-0000-0000-000000000002','direction','CREDIT','amount',999))) $m$,'P0001',null,'unbalanced transaction is rejected');
select is((select count(*) from public.financial_ledger_entries where reference_type='TEST' and reference_id='4d000000-0000-0000-0000-000000000001'),2::bigint,'unbalanced attempt created no partial ledger');
select lives_ok($n$ select public.reverse_financial_transaction((select transaction_group_id from public.financial_ledger_entries where reference_type='TEST' and reference_id='4d000000-0000-0000-0000-000000000001' limit 1),'test reversal') $n$,'posted transaction can be reversed');
select ok((select count(*) from public.financial_ledger_entries where reference_type='LEDGER_REVERSAL' and reference_id in(select id from public.financial_ledger_entries where reference_type='TEST' and reference_id='4d000000-0000-0000-0000-000000000001'))=2,'reversal creates opposite entries for every original entry');
select throws_ok($o$ update public.financial_ledger_entries set amount=2000 where reference_type='TEST' and reference_id='4d000000-0000-0000-0000-000000000001' $o$,'P0001',null,'posted ledger entries are immutable');

-- 28-34: payment verification and webhook idempotency.
select throws_ok($p$ select public.record_verified_payment('4a000000-0000-0000-0000-000000000001','finance-provider-ref-1',999,'41000000-0000-0000-0000-000000000002','SUCCEEDED') $p$,'P0001',null,'payment amount mismatch is rejected');
select lives_ok($q$ select public.record_verified_payment('4a000000-0000-0000-0000-000000000001','finance-provider-ref-1',1000,'41000000-0000-0000-0000-000000000002','SUCCEEDED') $q$,'matching verified payment succeeds');
select is((select status::text from public.payments where id='4a000000-0000-0000-0000-000000000001'),'SUCCEEDED','verified payment becomes succeeded');
select is((select status::text from public.purchases where id='49000000-0000-0000-0000-000000000001'),'PAID','verified payment moves purchase to paid');
select lives_ok($r$ select public.record_verified_payment('4a000000-0000-0000-0000-000000000001','finance-provider-ref-1',1000,'41000000-0000-0000-0000-000000000002','SUCCEEDED') $r$,'duplicate payment verification is idempotent');
select is((select public.record_payment_webhook_event('44000000-0000-0000-0000-000000000001','finance-event-1','charge.succeeded','finance-provider-ref-1','{"test":true}'::jsonb)),(select public.record_payment_webhook_event('44000000-0000-0000-0000-000000000001','finance-event-1','charge.succeeded','finance-provider-ref-1','{"test":false}'::jsonb)),'duplicate webhook event IDs are idempotent');
select is((select count(*) from public.payment_webhook_events where provider_id='44000000-0000-0000-0000-000000000001' and provider_event_id='finance-event-1'),1::bigint,'duplicate webhook creates one stored event');

-- 35-43: HBC fulfillment and refund recovery.
select lives_ok($s$ select public.fulfill_hbc_purchase('49000000-0000-0000-0000-000000000001','finance-fulfillment-1') $s$,'paid HBC purchase fulfills server-side');
select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000012'),1000::bigint,'fulfillment credits exact configured HBC quantity');
select is((select status from public.purchases where id='49000000-0000-0000-0000-000000000001'),'FULFILLED'::purchase_status,'fulfillment moves purchase to fulfilled');
select is((select public.fulfill_hbc_purchase('49000000-0000-0000-0000-000000000001','finance-fulfillment-retry')),(select id from public.fulfillments where purchase_id='49000000-0000-0000-0000-000000000001'),'completed fulfillment replay is idempotent');
select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000012'),1000::bigint,'fulfillment replay does not double-credit HBC');
select lives_ok($t$ select public.request_refund('4a000000-0000-0000-0000-000000000001',1000,'41000000-0000-0000-0000-000000000002','Full HBC refund') $t$,'server can request full refund');
select lives_ok($u$ select public.complete_refund((select id from public.refunds where payment_id='4a000000-0000-0000-0000-000000000001' order by created_at desc limit 1),'finance-refund-provider-1') $u$,'full HBC refund completes with safe reversal');
select is((select available_balance from public.coin_wallets where id='42000000-0000-0000-0000-000000000012'),0::bigint,'full refund removes previously fulfilled unspent HBC');
select is((select reversed_quantity from public.fulfillments where purchase_id='49000000-0000-0000-0000-000000000001'),1000::bigint,'refund records exact recovered HBC quantity');

select * from finish();
rollback;
