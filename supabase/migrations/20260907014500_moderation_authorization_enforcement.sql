begin;

-- Temporary USER_RESTRICTED actions participate in authorization immediately and
-- stop participating automatically after expires_at or when revoked.
create or replace function public.can_message_user(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and auth.uid() <> other_user_id
    and not public.is_user_restricted(auth.uid())
    and not public.is_blocked_between(other_user_id)
    and exists (
      select 1
      from public.users u
      join public.user_privacy_settings ps on ps.user_id = u.id
      where u.id = other_user_id
        and u.account_status = 'ACTIVE'
        and not public.is_user_restricted(other_user_id)
        and (
          ps.message_permission = 'EVERYONE'
          or (ps.message_permission = 'FOLLOWERS' and exists (
            select 1
            from public.follows f
            where f.follower_id = auth.uid()
              and f.following_id = other_user_id
          ))
        )
    );
$$;

revoke all on function public.can_message_user(uuid) from public, anon;
grant execute on function public.can_message_user(uuid) to authenticated;

create or replace function public.get_active_moderation_actions(target_user_id uuid)
returns table (
  action_id uuid,
  action_type public.moderation_action_type,
  reason text,
  severity public.severity_type,
  starts_at timestamptz,
  expires_at timestamptz,
  appealable boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    ma.id,
    ma.action_type,
    ma.reason,
    ma.severity,
    ma.starts_at,
    ma.expires_at,
    ma.target_type = 'USER'
      and ma.target_id = auth.uid()
      and ma.revoked_at is null
  from public.moderation_actions ma
  where ma.target_type = 'USER'
    and ma.target_id = target_user_id
    and ma.revoked_at is null
    and ma.starts_at <= now()
    and (ma.expires_at is null or ma.expires_at > now())
    and (target_user_id = auth.uid() or public.is_admin_permission('moderation.cases.view'));
$$;

revoke all on function public.get_active_moderation_actions(uuid) from public, anon;
grant execute on function public.get_active_moderation_actions(uuid) to authenticated;

commit;