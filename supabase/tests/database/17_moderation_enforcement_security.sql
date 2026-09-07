begin;

select plan(16);

select has_function('public', 'is_user_restricted', array['uuid']);
select function_returns('public', 'is_user_restricted', array['uuid'], 'boolean');
select has_function('public', 'execute_moderation_action', array['uuid','public.moderation_action_type','text','public.severity_type','timestamptz','timestamptz','jsonb']);
select function_returns('public', 'execute_moderation_action', array['uuid','public.moderation_action_type','text','public.severity_type','timestamptz','timestamptz','jsonb'], 'public.moderation_actions');
select has_function('public', 'execute_moderation_action', array['uuid','public.moderation_action_type','text','public.severity_type','integer']);
select function_returns('public', 'execute_moderation_action', array['uuid','public.moderation_action_type','text','public.severity_type','integer'], 'public.moderation_actions');
select has_function('public', 'submit_moderation_appeal', array['uuid','text']);
select function_returns('public', 'submit_moderation_appeal', array['uuid','text'], 'public.appeals');
select has_function('public', 'review_moderation_appeal', array['uuid','public.appeal_status','text']);
select function_returns('public', 'review_moderation_appeal', array['uuid','public.appeal_status','text'], 'public.appeals');
select has_function('public', 'get_active_moderation_actions', array['uuid']);
select function_returns('public', 'get_active_moderation_actions', array['uuid'], 'record');

select is_security_definer('public', 'is_user_restricted', array['uuid']);
select is_security_definer('public', 'execute_moderation_action', array['uuid','public.moderation_action_type','text','public.severity_type','timestamptz','timestamptz','jsonb']);
select is_security_definer('public', 'execute_moderation_action', array['uuid','public.moderation_action_type','text','public.severity_type','integer']);
select is_security_definer('public', 'submit_moderation_appeal', array['uuid','text']);
select is_security_definer('public', 'review_moderation_appeal', array['uuid','public.appeal_status','text']);

select * from finish();
rollback;
