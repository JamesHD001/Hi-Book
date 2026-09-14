begin;

-- Canonical system role/permission seed required by the moderation workflow.
-- Keep this migration data-only and idempotent so disposable E2E databases and
-- fresh environments receive the same moderation capability boundary.

insert into public.admin_roles (role_key, name, description, is_system_role)
values (
  'MODERATOR',
  'Moderator',
  'Reviews safety reports, assigns moderation cases, and executes approved moderation actions.',
  true
)
on conflict (role_key) do update
set name = excluded.name,
    description = excluded.description,
    is_system_role = true,
    updated_at = now();

insert into public.admin_permissions (permission_key, name, description, resource, action)
values
  (
    'moderation.cases.view',
    'View moderation cases',
    'View the moderation queue and case details.',
    'MODERATION_CASES',
    'VIEW'
  ),
  (
    'moderation.cases.assign',
    'Assign moderation cases',
    'Assign moderation cases and add internal moderation notes.',
    'MODERATION_CASES',
    'ASSIGN'
  ),
  (
    'moderation.actions.execute',
    'Execute moderation actions',
    'Execute server-authorized moderation actions against users or content.',
    'MODERATION_ACTIONS',
    'EXECUTE'
  )
on conflict (permission_key) do update
set name = excluded.name,
    description = excluded.description,
    resource = excluded.resource,
    action = excluded.action,
    updated_at = now();

insert into public.admin_role_permissions (role_id, permission_id)
select ar.id, ap.id
from public.admin_roles ar
cross join public.admin_permissions ap
where ar.role_key = 'MODERATOR'
  and ap.permission_key in (
    'moderation.cases.view',
    'moderation.cases.assign',
    'moderation.actions.execute'
  )
on conflict do nothing;

commit;
