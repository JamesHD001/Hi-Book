begin;

create extension if not exists pgtap;

select plan(26);

-- Deterministic identities used only inside this rolled-back test transaction.
-- auth.users is seeded first because public.users references Supabase Auth.
select lives_ok($seed$
  insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'behavior-a@example.test', 'test-hash', now(), now(), now()),
    ('00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'behavior-b@example.test', 'test-hash', now(), now(), now()),
    ('00000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'behavior-c@example.test', 'test-hash', now(), now(), now())
$seed$, 'test auth identities can be seeded');

insert into public.users (id, first_name, last_name, date_of_birth, gender, country_code, account_status)
values
  ('00000000-0000-0000-0000-000000000001', 'Behavior', 'Alice', '1990-01-01', 'FEMALE', 'NG', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000002', 'Behavior', 'Bob', '1990-01-02', 'MALE', 'US', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000003', 'Behavior', 'Cara', '1990-01-03', 'UNDISCLOSED', 'GB', 'ACTIVE');

insert into public.profiles (user_id, username, username_normalized, display_name)
values
  ('00000000-0000-0000-0000-000000000001', 'behavior_alice', 'behavior_alice', 'Alice'),
  ('00000000-0000-0000-0000-000000000002', 'behavior_bob', 'behavior_bob', 'Bob'),
  ('00000000-0000-0000-0000-000000000003', 'behavior_cara', 'behavior_cara', 'Cara');

insert into public.user_privacy_settings (user_id, profile_visibility, country_visibility, message_permission)
values
  ('00000000-0000-0000-0000-000000000001', 'PUBLIC', 'PUBLIC', 'FOLLOWERS'),
  ('00000000-0000-0000-0000-000000000002', 'PUBLIC', 'PUBLIC', 'FOLLOWERS'),
  ('00000000-0000-0000-0000-000000000003', 'PUBLIC', 'PUBLIC', 'FOLLOWERS');

insert into public.posts (id, user_id, content, visibility, status, published_at)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Alice public post', 'PUBLIC', 'PUBLISHED', now()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Alice followers post', 'FOLLOWERS', 'PUBLISHED', now()),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Alice private post', 'PRIVATE', 'PUBLISHED', now());

-- Act as Alice.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select ok((select count(*) from public.users) = 1, 'RLS isolates users to the current account');
select ok((select count(*) from public.profiles) = 1, 'RLS isolates profiles to the current account when querying directly');
select ok((select public.can_view_profile('00000000-0000-0000-0000-000000000002')) is true, 'public profile is viewable before blocking');
select ok((select count(*) from public.posts where id = '10000000-0000-0000-0000-000000000001') = 1, 'owner can view own public post');
select ok((select count(*) from public.posts where id = '10000000-0000-0000-0000-000000000003') = 1, 'owner can view own private post');

-- Alice can follow Bob, but cannot follow herself or forge Bob as follower.
select lives_ok($follow$
  insert into public.follows (follower_id, following_id)
  values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')
$follow$, 'current user can create a follow as self');
select throws_ok($self_follow$
  insert into public.follows (follower_id, following_id)
  values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001')
$self_follow$, '42501', null, 'self-follow is rejected by authorization');
select throws_ok($spoof_follow$
  insert into public.follows (follower_id, following_id)
  values ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003')
$spoof_follow$, '42501', null, 'follow cannot spoof another follower identity');
select throws_ok($duplicate_follow$
  insert into public.follows (follower_id, following_id)
  values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')
$duplicate_follow$, '23505', null, 'duplicate follow is rejected by the database uniqueness constraint');

-- Switch to Bob to test public/followers/private boundaries.
set local role postgres;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
set local role authenticated;

select ok((select count(*) from public.posts where id = '10000000-0000-0000-0000-000000000001') = 1, 'authenticated user can view public post');
select ok((select count(*) from public.posts where id = '10000000-0000-0000-0000-000000000002') = 1, 'follower can view followers-only post');
select ok((select count(*) from public.posts where id = '10000000-0000-0000-0000-000000000003') = 0, 'follower cannot view private post');
select ok((select count(*) from public.post_likes where post_id = '10000000-0000-0000-0000-000000000003') = 0, 'private post interactions cannot be enumerated through likes');
select throws_ok($private_like$
  insert into public.post_likes (post_id, user_id)
  values ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002')
$private_like$, '42501', null, 'private post cannot be liked by an unauthorized user');

-- Make Bob private. Alice is already following Bob, so she remains authorized.
set local role postgres;
update public.user_privacy_settings
set profile_visibility = 'PRIVATE'
where user_id = '00000000-0000-0000-0000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select ok((select public.can_view_profile('00000000-0000-0000-0000-000000000002')) is true, 'current follower can view a private profile');

-- Block Bob. The block is a universal barrier and removes the conflicting follow.
select lives_ok($block$
  insert into public.blocks (blocker_id, blocked_id)
  values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')
$block$, 'current user can create a block');
select ok((select count(*) from public.follows where follower_id = '00000000-0000-0000-0000-000000000001' and following_id = '00000000-0000-0000-0000-000000000002') = 0, 'blocking removes the conflicting follow relationship');
select ok((select public.is_blocked_between('00000000-0000-0000-0000-000000000002')) is true, 'block is recognized in both directions by authorization');
select ok((select public.can_view_profile('00000000-0000-0000-0000-000000000002')) is false, 'blocked users cannot view each other profiles');
select throws_ok($blocked_follow$
  insert into public.follows (follower_id, following_id)
  values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002')
$blocked_follow$, '42501', null, 'blocked relationship prevents refollowing');
select ok((select public.can_message_user('00000000-0000-0000-0000-000000000002')) is false, 'block overrides message authorization');

select * from finish();

rollback;
