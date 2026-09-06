begin;

create extension if not exists pgtap;

select plan(17);

-- Deterministic test identities. auth.users is seeded first because public.users
-- references Supabase Auth.
select lives_ok($seed$
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'message-a@example.test', 'test-hash', now(), now(), now()),
    ('00000000-0000-0000-0000-000000000012', 'authenticated', 'authenticated', 'message-b@example.test', 'test-hash', now(), now(), now()),
    ('00000000-0000-0000-0000-000000000013', 'authenticated', 'authenticated', 'message-c@example.test', 'test-hash', now(), now(), now())
$seed$, 'messaging test auth identities can be seeded');

insert into public.users (id, first_name, last_name, date_of_birth, gender, country_code, account_status)
values
  ('00000000-0000-0000-0000-000000000011', 'Message', 'Alice', '1990-01-01', 'FEMALE', 'NG', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000012', 'Message', 'Bob', '1990-01-02', 'MALE', 'US', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000013', 'Message', 'Cara', '1990-01-03', 'UNDISCLOSED', 'GB', 'ACTIVE');

insert into public.profiles (user_id, username, username_normalized, display_name)
values
  ('00000000-0000-0000-0000-000000000011', 'message_alice', 'message_alice', 'Alice'),
  ('00000000-0000-0000-0000-000000000012', 'message_bob', 'message_bob', 'Bob'),
  ('00000000-0000-0000-0000-000000000013', 'message_cara', 'message_cara', 'Cara');

insert into public.user_privacy_settings (user_id, profile_visibility, country_visibility, message_permission)
values
  ('00000000-0000-0000-0000-000000000011', 'PUBLIC', 'PUBLIC', 'FOLLOWERS'),
  ('00000000-0000-0000-0000-000000000012', 'PUBLIC', 'PUBLIC', 'FOLLOWERS'),
  ('00000000-0000-0000-0000-000000000013', 'PUBLIC', 'PUBLIC', 'FOLLOWERS');

-- Alice follows Bob, making Alice an authorized sender when Bob allows followers.
insert into public.follows (follower_id, following_id)
values ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012');

-- Seed the direct conversation and a second conversation for cross-conversation
-- reply tests as the trusted database role.
insert into public.conversations (id, type, created_at, updated_at)
values
  ('20000000-0000-0000-0000-000000000011', 'DIRECT', now(), now()),
  ('20000000-0000-0000-0000-000000000012', 'DIRECT', now(), now());

insert into public.conversation_participants (conversation_id, user_id, joined_at, last_read_at, updated_at)
values
  ('20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000011', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000011', now(), now(), now()),
  ('20000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000013', now(), now(), now());

-- A participant can send through the server-owned RPC and the sender identity
-- is always taken from auth.uid(), not from client-supplied sender_id.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok($send$
  select public.send_message(
    '20000000-0000-0000-0000-000000000011',
    'TEXT',
    'Hello Bob',
    null,
    null,
    '[]'::jsonb
  )
$send$, 'conversation participant can send a text message');

select ok(
  (select count(*) from public.messages where conversation_id='20000000-0000-0000-0000-000000000011' and sender_id='00000000-0000-0000-0000-000000000011' and content='Hello Bob') = 1,
  'message sender is derived from the authenticated identity'
);

select throws_ok($spoof$
  insert into public.messages (conversation_id, sender_id, message_type, content, status)
  values ('20000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012', 'TEXT', 'Spoofed sender', 'SENT')
$spoof$, '42501', null, 'client cannot insert a message while spoofing another sender');

select ok(
  (select count(*) from public.conversations where id='20000000-0000-0000-0000-000000000011') = 1,
  'conversation exists for its participants'
);

-- Non-participant isolation.
set local role postgres;
update public.user_privacy_settings
set message_permission = 'EVERYONE'
where user_id = '00000000-0000-0000-0000-000000000013';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000013', true);

select ok((select count(*) from public.conversations where id='20000000-0000-0000-0000-000000000011') = 0, 'non-participant cannot read a conversation');
select ok((select count(*) from public.messages where conversation_id='20000000-0000-0000-0000-000000000011') = 0, 'non-participant cannot read messages');
select throws_ok($nonparticipant_send$
  select public.send_message('20000000-0000-0000-0000-000000000011','TEXT','Unauthorized',null,null,'[]'::jsonb)
$nonparticipant_send$, 'P0001', null, 'non-participant cannot send to the conversation');

-- Switch back to Alice for reply and validation tests.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);

select lives_ok($reply$
  select public.send_message(
    '20000000-0000-0000-0000-000000000011',
    'TEXT',
    'Replying to you',
    null,
    (select id from public.messages where conversation_id='20000000-0000-0000-0000-000000000011' order by created_at asc limit 1),
    '[]'::jsonb
  )
$reply$, 'reply target in the same conversation is allowed');

select throws_ok($cross_reply$
  select public.send_message(
    '20000000-0000-0000-0000-000000000011',
    'TEXT',
    'Cross conversation reply',
    null,
    '30000000-0000-0000-0000-000000000012',
    '[]'::jsonb
  )
$cross_reply$, 'P0001', null, 'reply target from another conversation is rejected');

select throws_ok($empty_text$
  select public.send_message('20000000-0000-0000-0000-000000000011','TEXT','   ',null,null,'[]'::jsonb)
$empty_text$, 'P0001', null, 'empty text messages are rejected');

select throws_ok($oversize_text$
  select public.send_message('20000000-0000-0000-0000-000000000011','TEXT',repeat('x',4001),null,null,'[]'::jsonb)
$oversize_text$, 'P0001', null, 'messages over 4000 characters are rejected');

-- Message permission is authorization, not conversation destruction.
set local role postgres;
update public.user_privacy_settings
set message_permission = 'NO_ONE'
where user_id = '00000000-0000-0000-0000-000000000012';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);

select throws_ok($no_one$
  select public.send_message('20000000-0000-0000-0000-000000000011','TEXT','Blocked by permission',null,null,'[]'::jsonb)
$no_one$, 'P0001', null, 'NO_ONE message permission blocks new messages');
select ok((select count(*) from public.conversations where id='20000000-0000-0000-0000-000000000011') = 1, 'changing message permission does not delete an existing conversation');

set local role postgres;
update public.user_privacy_settings
set message_permission = 'EVERYONE'
where user_id = '00000000-0000-0000-0000-000000000012';
set local role authenticated;
select lives_ok($everyone$
  select public.send_message('20000000-0000-0000-0000-000000000011','TEXT','Permission restored',null,null,'[]'::jsonb)
$everyone$, 'EVERYONE message permission allows an existing conversation to continue');

-- Block is a stronger barrier than message permission.
set local role postgres;
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000011');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);

select throws_ok($blocked_send$
  select public.send_message('20000000-0000-0000-0000-000000000011','TEXT','Blocked',null,null,'[]'::jsonb)
$blocked_send$, 'P0001', null, 'block overrides message permission and prevents new messages');

-- Shared-post messages must not bypass post visibility.
set local role postgres;
insert into public.posts (id, user_id, content, visibility, status, published_at)
values ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000012', 'Bob private post', 'PRIVATE', 'PUBLISHED', now());
delete from public.blocks
where blocker_id='00000000-0000-0000-0000-000000000012'
  and blocked_id='00000000-0000-0000-0000-000000000011';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000011', true);

select throws_ok($private_share$
  select public.send_message('20000000-0000-0000-0000-000000000011','POST_SHARE',null,'10000000-0000-0000-0000-000000000011',null,'[]'::jsonb)
$private_share$, 'P0001', null, 'sharing an inaccessible private post through messaging is rejected');

select * from finish();

rollback;
