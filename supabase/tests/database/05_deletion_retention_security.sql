begin;
create extension if not exists pgtap;
select plan(23);

-- Deterministic deletion fixtures. Registration creates the identity/profile/privacy
-- rows; trusted setup promotes these test accounts to ACTIVE.
insert into auth.users (id,aud,role,email,encrypted_password,raw_user_meta_data,email_confirmed_at,created_at,updated_at) values
('50000000-0000-0000-0000-000000000011','authenticated','authenticated','delete-alice@example.test','test-hash','{"first_name":"Delete","last_name":"Alice","date_of_birth":"1990-01-01","gender":"FEMALE","country_code":"NG"}'::jsonb,now(),now(),now()),
('50000000-0000-0000-0000-000000000012','authenticated','authenticated','delete-bob@example.test','test-hash','{"first_name":"Delete","last_name":"Bob","date_of_birth":"1990-01-02","gender":"MALE","country_code":"US"}'::jsonb,now(),now(),now());
set local role postgres;
update public.users set account_status='ACTIVE' where id in ('50000000-0000-0000-0000-000000000011','50000000-0000-0000-0000-000000000012');
update public.user_privacy_settings set message_permission='EVERYONE' where user_id in ('50000000-0000-0000-0000-000000000011','50000000-0000-0000-0000-000000000012');
set local role authenticated;

-- 1-6: direct lifecycle mutation is blocked for authenticated clients.
set local role authenticated;
select set_config('request.jwt.claim.sub','50000000-0000-0000-0000-000000000011',true);
select set_config('request.jwt.claim.role','authenticated',true);

select throws_ok($a$ update public.users set account_status='DEACTIVATED' where id='50000000-0000-0000-0000-000000000011' $a$,'42501',null,'direct account status mutation is safely denied');
select is((select account_status from public.users where id='50000000-0000-0000-0000-000000000011'),'ACTIVE'::account_status,'direct account status mutation has no effect');
select throws_ok($b$ update public.users set deleted_at=now() where id='50000000-0000-0000-0000-000000000011' $b$,'42501',null,'direct deletion timestamp mutation is safely denied');
select is((select deleted_at from public.users where id='50000000-0000-0000-0000-000000000011'),null::timestamptz,'direct deletion timestamp mutation has no effect');
select throws_ok($c$ insert into public.account_deletion_request(user_id,status,scheduled_for) values('50000000-0000-0000-0000-000000000011','SCHEDULED',now()+interval '30 days') $c$,'42501',null,'clients cannot directly create deletion requests');
select is((select count(*) from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011'),0::bigint,'blocked direct writes leave no deletion request');

-- 7-14: request workflow creates a 30-day schedule and restricts account access.
select lives_ok($e$ select public.request_account_deletion() $e$,'authenticated owner can request deletion through RPC');
select is((select status from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' order by requested_at desc limit 1),'SCHEDULED'::deletion_status,'request is scheduled rather than immediately destroyed');
select ok((select scheduled_for between requested_at + interval '29 days' and requested_at + interval '31 days' from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' order by requested_at desc limit 1),'deletion grace period is approximately 30 days');
select is((select account_status from public.users where id='50000000-0000-0000-0000-000000000011'),'DEACTIVATED'::account_status,'request restricts the account during the grace period');
select throws_ok($f$ select public.request_account_deletion() $f$,'P0001',null,'duplicate active deletion request is rejected');
select is((select count(*) from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' and status='SCHEDULED'),1::bigint,'duplicate request does not create another schedule');
select ok((select public.can_view_profile('50000000-0000-0000-0000-000000000011')) = false,'deactivated account is not publicly viewable');
select is((select count(*) from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011'),1::bigint,'deletion history remains auditable during grace period');

-- 15-20: cancellation is controlled, auditable and restores only the account.
select lives_ok($g$ select public.cancel_account_deletion() $g$,'owner can cancel a scheduled deletion through RPC');
select is((select status from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' order by requested_at desc limit 1),'CANCELLED'::deletion_status,'cancel changes request to cancelled');
select ok((select cancelled_at is not null from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' order by requested_at desc limit 1),'cancellation timestamp is recorded');
select is((select account_status from public.users where id='50000000-0000-0000-0000-000000000011'),'ACTIVE'::account_status,'cancellation restores account status');
select lives_ok($h$ update public.account_deletion_request set status='SCHEDULED' where user_id='50000000-0000-0000-0000-000000000011' and status='CANCELLED' $h$,'direct reopen attempt is safely denied');
select is((select status from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' order by requested_at desc limit 1),'CANCELLED'::deletion_status,'cancelled request remains closed to direct client mutation');

-- 21-23: a cancelled request may be followed by one new controlled request.
select lives_ok($i$ select public.request_account_deletion() $i$,'a new deletion request can be made after cancellation');
select is((select count(*) from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011'),2::bigint,'cancelled history is retained and new request is separate');
select is((select count(*) from public.account_deletion_request where user_id='50000000-0000-0000-0000-000000000011' and status='SCHEDULED'),1::bigint,'only one active deletion schedule exists');

select * from finish();
rollback;
