begin;
create extension if not exists pgtap;
select plan(14);

insert into auth.users (
  id, aud, role, email, encrypted_password, raw_user_meta_data,
  email_confirmed_at, created_at, updated_at, last_sign_in_at
) values (
  '60000000-0000-0000-0000-000000000011',
  'authenticated',
  'authenticated',
  'inactive-lifecycle@example.test',
  'test-hash',
  '{"first_name":"Inactive","last_name":"Lifecycle","date_of_birth":"1990-01-01","gender":"FEMALE","country_code":"NG"}'::jsonb,
  now() - interval '181 days',
  now() - interval '181 days',
  now(),
  now() - interval '181 days'
);

set local role postgres;
select set_config('hibook.system_operation','true',true);
update public.users
   set account_status = 'ACTIVE',
       lifecycle_state = 'ACTIVE'
 where id = '60000000-0000-0000-0000-000000000011';

select is(
  public.process_inactive_account_lifecycle(),
  1,
  'worker pauses an account after 180 days without login'
);
select is(
  (select lifecycle_state from public.users where id='60000000-0000-0000-0000-000000000011'),
  'PAUSED',
  'inactive account transitions to PAUSED'
);
select ok(
  (select paused_at is not null from public.users where id='60000000-0000-0000-0000-000000000011'),
  'pause timestamp is recorded'
);
select is(
  (select account_status from public.users where id='60000000-0000-0000-0000-000000000011'),
  'ACTIVE'::account_status,
  'paused account remains eligible for existing visibility rules'
);

update public.users
   set paused_at = now() - interval '91 days'
 where id = '60000000-0000-0000-0000-000000000011';

select is(
  public.process_inactive_account_lifecycle(),
  1,
  'worker schedules deletion after 90 days paused'
);
select is(
  (select lifecycle_state from public.users where id='60000000-0000-0000-0000-000000000011'),
  'PENDING_DELETION',
  'scheduled account enters hidden deletion-pending state'
);
select is(
  (select account_status from public.users where id='60000000-0000-0000-0000-000000000011'),
  'DEACTIVATED'::account_status,
  'deletion-pending account is deactivated from public visibility'
);
select is(
  (select lifecycle_source from public.account_deletion_request where user_id='60000000-0000-0000-0000-000000000011' order by requested_at desc limit 1),
  'INACTIVITY',
  'automatic deletion schedule is distinguishable from a manual request'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-0000-0000-000000000011',true);
select set_config('request.jwt.claim.role','authenticated',true);
select throws_ok(
  $stale_login$ select public.recover_inactive_account() $stale_login$,
  '42501',
  null,
  'recovery requires a sign-in after the account entered the restricted lifecycle state'
);

select throws_ok(
  $paused_write$ update public.users set updated_at = now() where id = '60000000-0000-0000-0000-000000000011' $paused_write$,
  '42501',
  'permission denied for table users',
  'authenticated clients cannot directly update lifecycle rows because table privileges deny it'
);

set local role postgres;
update auth.users
   set last_sign_in_at = now()
 where id = '60000000-0000-0000-0000-000000000011';
set local role authenticated;

select lives_ok(
  $q$ select public.recover_inactive_account() $q$,
  'authenticated owner with a fresh sign-in can recover during the recovery window'
);
select is(
  (select lifecycle_state from public.users where id='60000000-0000-0000-0000-000000000011'),
  'ACTIVE',
  'successful recovery restores active lifecycle state'
);
select is(
  (select account_status from public.users where id='60000000-0000-0000-0000-000000000011'),
  'ACTIVE'::account_status,
  'successful recovery restores account visibility state'
);
select is(
  (select status from public.account_deletion_request where user_id='60000000-0000-0000-0000-000000000011' and lifecycle_source='INACTIVITY' order by requested_at desc limit 1),
  'CANCELLED'::deletion_status,
  'recovery cancels the inactivity deletion schedule'
);

select * from finish();
rollback;
