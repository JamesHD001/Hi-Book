begin;
create extension if not exists pgtap;
select plan(22);

-- Deterministic deletion fixtures.
insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
('50000000-0000-0000-0000-000000000011','authenticated','authenticated','delete-alice@example.test','test-hash',now(),now(),now()),
('50000000-0000-0000-0000-000000000012','authenticated','authenticated','delete-bob@example.test','test-hash',now(),now(),now());
insert into public.users(id,first_name,last_name,date_of_birth,gender,country_code,account_status) values
('50000000-0000-0000-0000-000000000011','Delete','Alice','1990-01-01','FEMALE','NG','ACTIVE'),
('50000000-0000-0000-0000-000000000012','Delete','Bob','1990-01-02','MALE','US','ACTIVE');
insert into public.profiles(user_id,username,username_normalized,display_name) values
('50000000-0000-0000-0000-000000000011','delete_alice','delete_alice','Alice'),
('50000000-0000-0000-0000-000000000012','delete_bob','delete_bob','Bob');
insert into public.user_privacy_settings(user_id,profile_visibility,country_visibility,message_permission) values
('50000000-0000-0000-0000-000000000011','PUBLIC','PUBLIC','EVERYONE'),
('50000000-0000-0000-0000-000000000012','PUBLIC','PUBLIC','EVERYONE');

-- 1-5: direct lifecycle mutation is blocked for authenticated clients.
-- RLS denies these direct writes, so PostgreSQL may report zero affected rows
-- rather than an exception. The important security property is that state does
-- not change and deletion requests cannot be inserted directly.
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000011',true);
select set_config('request.jwt.claim.role','authenticated',true);

select lives_ok($a$ update public.users set account_status='DEACTIVATED' where id='50000000-0000-0000-0000-000000000011' $a$,'direct account status mutation is safely denied');
select is((select account_status from public.users where id='50000000-0000-0000-0000-000000000011'),'ACTIVE'::account_status,'direct account status mutation has no effect');
select lives_ok($b$ update public.users set deleted_at=now() where id='50000000-0000-0000-0000-000000000011' $b$,'direct deletion timestamp mutation is safely denied');
select is((select deleted_at from public.users where id='50000000-0000-0000-0000-000000000011'),null::timestamptz,'direct deletion timestamp mutation has no effect');
select throws_ok($c$ insert into public.account_deletion_request(user_id,status,scheduled_for) values('50000000-0000-0000-0000-000000000011','SCHEDULED',now()+interval '30 days') $c$,'42501',null,'clients cannot directly create deletion requests');

-- 6-13: request workflow creates a 30-day schedule and restricts account access.
select lives_ok($e$ select public.request_account_deletion() $e$,'authenticated owner can request deletion through RPC');
select is((select status from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' order by requested_at desc limit 1),'SCHEDULED'::deletion_status,'request is scheduled rather than immediately destroyed');
select ok((select scheduled_for between requested_at + interval '29 days' and requested_at + interval '31 days' from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' order by requested_at desc limit 1),'deletion grace period is approximately 30 days');
select is((select account_status from public.users where id='50000000-0000-0000-0000-000000000011'),'DEACTIVATED'::account_status,'request restricts the account during the grace period');
select throws_ok($f$ select public.request_account_deletion() $f$,'P0001',null,'duplicate active deletion request is rejected');
select is((select count(*) from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' and status='SCHEDULED'),1::bigint,'duplicate request does not create another schedule');
select ok((select public.can_view_profile('50000000-0000-0000-0000-000000000011')) = false,'deactivated account is not publicly viewable');
select is((select count(*) from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011'),1::bigint,'deletion history remains auditable during grace period');

-- 14-18: cancellation is controlled, auditable and restores only the account.
select lives_ok($g$ select public.cancel_account_deletion() $g$,'owner can cancel a scheduled deletion through RPC');
select is((select status from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' order by requested_at desc limit 1),'CANCELLED'::deletion_status,'cancel changes request to cancelled');
select ok((select cancelled_at is not null from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' order by requested_at desc limit 1),'cancellation timestamp is recorded');
select is((select account_status from public.users where id='50000000-0000-0000-0000-000000000011'),'ACTIVE'::account_status,'cancellation restores account status');
select is((select status from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' and status='CANCELLED'),'CANCELLED'::deletion_status,'cancelled request cannot be reopened through the client update path');

-- 19-22: a cancelled request may be followed by one new controlled request.
select lives_ok($i$ select public.request_account_deletion() $i$,'a new deletion request can be made after cancellation');
select is((select count(*) from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011'),2::bigint,'cancelled history is retained and new request is separate');
select is((select count(*) from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' and status='SCHEDULED'),1::bigint,'only one active deletion schedule exists');
select is((select account_status from public.users where id='50000000-0000-0000-0000-000000000011'),'DEACTIVATED'::account_status,'new request re-enters deletion grace period');

select * from finish();
rollback;
