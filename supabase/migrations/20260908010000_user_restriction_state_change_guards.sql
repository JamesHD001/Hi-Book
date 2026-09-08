begin;

create or replace function public.is_user_restricted(target_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.moderation_actions ma where ma.target_type = 'USER' and ma.target_id = target_user_id and ma.action_type = 'USER_RESTRICTED' and ma.revoked_at is null and ma.starts_at <= now() and (ma.expires_at is null or ma.expires_at > now())); $$;
revoke all on function public.is_user_restricted(uuid) from public, anon;
grant execute on function public.is_user_restricted(uuid) to authenticated;

create or replace function public.enforce_user_restriction_on_state_change()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin if auth.uid() is null then return new; end if; if public.is_user_restricted(auth.uid()) then raise exception 'Account is temporarily restricted from this action'; end if; return new; end; $$;
revoke all on function public.enforce_user_restriction_on_state_change() from public, anon;

drop trigger if exists enforce_user_restriction_follow on public.follows;
create trigger enforce_user_restriction_follow before insert or update or delete on public.follows for each row execute function public.enforce_user_restriction_on_state_change();
drop trigger if exists enforce_user_restriction_post on public.posts;
create trigger enforce_user_restriction_post before insert or update or delete on public.posts for each row execute function public.enforce_user_restriction_on_state_change();
drop trigger if exists enforce_user_restriction_post_media on public.post_media;
create trigger enforce_user_restriction_post_media before insert or update or delete on public.post_media for each row execute function public.enforce_user_restriction_on_state_change();
drop trigger if exists enforce_user_restriction_post_like on public.post_likes;
create trigger enforce_user_restriction_post_like before insert or update or delete on public.post_likes for each row execute function public.enforce_user_restriction_on_state_change();
drop trigger if exists enforce_user_restriction_comment on public.comments;
create trigger enforce_user_restriction_comment before insert or update or delete on public.comments for each row execute function public.enforce_user_restriction_on_state_change();
drop trigger if exists enforce_user_restriction_comment_like on public.comment_likes;
create trigger enforce_user_restriction_comment_like before insert or update or delete on public.comment_likes for each row execute function public.enforce_user_restriction_on_state_change();
drop trigger if exists enforce_user_restriction_post_share on public.post_shares;
create trigger enforce_user_restriction_post_share before insert or update or delete on public.post_shares for each row execute function public.enforce_user_restriction_on_state_change();
drop trigger if exists enforce_user_restriction_mention on public.mentions;
create trigger enforce_user_restriction_mention before insert or update or delete on public.mentions for each row execute function public.enforce_user_restriction_on_state_change();
drop trigger if exists enforce_user_restriction_post_tag on public.post_tags;
create trigger enforce_user_restriction_post_tag before insert or update or delete on public.post_tags for each row execute function public.enforce_user_restriction_on_state_change();
drop trigger if exists enforce_user_restriction_message on public.messages;
create trigger enforce_user_restriction_message before insert or update or delete on public.messages for each row execute function public.enforce_user_restriction_on_state_change();

create or replace function public.get_moderation_appeal_queue(page_limit integer default 50)
returns table (appeal_id uuid, case_id uuid, case_number varchar, action_id uuid, appellant_id uuid, target_type public.moderation_target_type, target_id uuid, action_type public.moderation_action_type, action_reason text, reason text, status public.appeal_status, created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$ begin
  if auth.uid() is null or not public.is_admin_permission('moderation.appeals.review') then raise exception 'Appeal queue access denied'; end if;
  if page_limit < 1 or page_limit > 100 then raise exception 'Page limit must be between 1 and 100'; end if;
  return query select a.id, mc.id, mc.case_number, ma.id, a.appellant_id, ma.target_type, ma.target_id, ma.action_type, ma.reason, a.reason, a.status, a.submitted_at from public.appeals a join public.moderation_actions ma on ma.id = a.action_id left join public.moderation_cases mc on mc.id = ma.case_id where a.status in ('SUBMITTED','IN_REVIEW') order by case ma.severity when 'CRITICAL' then 0 when 'HIGH' then 1 when 'MEDIUM' then 2 else 3 end, a.submitted_at asc limit page_limit;
end; $$;
revoke all on function public.get_moderation_appeal_queue(integer) from public, anon;
grant execute on function public.get_moderation_appeal_queue(integer) to authenticated;

create or replace function public.get_moderation_appeal(target_appeal_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$ declare v_result jsonb; begin
  if auth.uid() is null or not public.is_admin_permission('moderation.appeals.review') then raise exception 'Appeal access denied'; end if;
  select jsonb_build_object('appeal_id', a.id, 'case_id', mc.id, 'case_number', mc.case_number, 'action_id', ma.id, 'appellant_id', a.appellant_id, 'target_type', ma.target_type, 'target_id', ma.target_id, 'action_type', ma.action_type, 'action_reason', ma.reason, 'appeal_reason', a.reason, 'status', a.status, 'created_at', a.submitted_at, 'reviewed_by', a.reviewed_by, 'resolved_at', a.resolved_at, 'resolution', a.resolution) into v_result from public.appeals a join public.moderation_actions ma on ma.id = a.action_id left join public.moderation_cases mc on mc.id = ma.case_id where a.id = target_appeal_id;
  if v_result is null then raise exception 'Appeal not found'; end if; return v_result;
end; $$;
revoke all on function public.get_moderation_appeal(uuid) from public, anon;
grant execute on function public.get_moderation_appeal(uuid) to authenticated;

commit;