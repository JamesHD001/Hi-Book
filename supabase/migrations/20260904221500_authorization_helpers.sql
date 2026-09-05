-- Hi!Book 2.0 — canonical authorization helpers
-- These helpers are intentionally small and reusable across RLS and RPCs.

begin;

create or replace function public.is_blocked_between(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = other_user_id)
       or (b.blocker_id = other_user_id and b.blocked_id = auth.uid())
  );
$$;

create or replace function public.is_admin_permission(p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.admin_user_roles aur
    join public.admin_role_permissions arp on arp.role_id = aur.role_id
    join public.admin_permissions ap on ap.id = arp.permission_id
    join public.users u on u.id = aur.user_id
    where aur.user_id = auth.uid()
      and aur.revoked_at is null
      and u.account_status = 'ACTIVE'
      and ap.permission_key = p_permission_key
  );
$$;

create or replace function public.can_message_user(p_target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    p_target_user_id is not null
    and auth.uid() is not null
    and auth.uid() <> p_target_user_id
    and not public.is_blocked_between(p_target_user_id)
    and exists (
      select 1 from public.users u
      where u.id = p_target_user_id
        and u.account_status = 'ACTIVE'
    )
    and (
      exists (
        select 1 from public.user_privacy_settings ups
        where ups.user_id = p_target_user_id
          and ups.message_permission = 'EVERYONE'
      )
      or (
        exists (
          select 1 from public.user_privacy_settings ups
          where ups.user_id = p_target_user_id
            and ups.message_permission = 'FOLLOWERS'
        )
        and exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid()
            and f.following_id = p_target_user_id
        )
      )
    );
$$;

revoke all on function public.is_blocked_between(uuid) from public;
revoke all on function public.is_admin_permission(text) from public;
revoke all on function public.can_message_user(uuid) from public;

grant execute on function public.is_blocked_between(uuid) to authenticated;
grant execute on function public.is_admin_permission(text) to authenticated;
grant execute on function public.can_message_user(uuid) to authenticated;

commit;
