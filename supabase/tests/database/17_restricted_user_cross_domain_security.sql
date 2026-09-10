begin;

select plan(10);

select has_function('public', 'guard_restricted_social_write', array[]::text[], 'restricted-write trigger guard exists');
select has_trigger('public', 'follows', 'trg_restricted_follows', 'follow writes are guarded');
select has_trigger('public', 'posts', 'trg_restricted_posts', 'post writes are guarded');
select has_trigger('public', 'comments', 'trg_restricted_comments', 'comment writes are guarded');
select has_trigger('public', 'post_likes', 'trg_restricted_post_likes', 'post likes are guarded');
select has_trigger('public', 'comment_likes', 'trg_restricted_comment_likes', 'comment likes are guarded');
select has_trigger('public', 'post_shares', 'trg_restricted_post_shares', 'post shares are guarded');
select has_trigger('public', 'messages', 'trg_restricted_messages', 'message writes are guarded');
select function_returns('public', 'guard_restricted_social_write', array[]::text[], 'trigger', 'trigger function returns trigger');
select isnt_empty(
  $$select 1 from pg_trigger where tgname = 'trg_restricted_posts' and not tgenabled = 'D'$$,
  'restricted post trigger is enabled'
);

select * from finish();
rollback;
