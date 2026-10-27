# Inactive Account Lifecycle

## Product rules

Hi!Book automatically manages accounts that have not completed a successful login:

1. **180 days inactive:** set `users.lifecycle_state = 'PAUSED'`. The account remains visible according to existing profile/privacy rules. Existing user data remains available to the owner, but social mutations are blocked while paused.
2. **90 days paused:** set `lifecycle_state = 'PENDING_DELETION'`, set `account_status = 'DEACTIVATED'`, hide the account from other users, and start a 30-day recovery window.
3. **During recovery:** an authenticated owner can use the account recovery screen to reactivate. The recovery RPC cancels the automatic deletion request and restores the account's visibility and active lifecycle state.
4. **After the recovery deadline:** a trusted worker must remove the account's storage objects, user-owned content and profile data, and the authentication identity. This operation must be idempotent and retryable. The account must not be considered permanently deleted until the purge has actually succeeded.

The inactivity clock uses Supabase Auth's `last_sign_in_at`, falling back to `auth.users.created_at` for accounts that have never successfully logged in. The database scheduler checks every 15 minutes. A separate trusted worker must run at least hourly to complete expired purges.

## Security requirements

- Lifecycle state and timestamps are server-controlled; authenticated clients cannot update them directly.
- The recovery RPC requires an authenticated session for the account owner.
- Paused accounts remain visible, but writes to social content and account settings are blocked.
- Accounts pending deletion are deactivated and hidden through existing account visibility rules.
- The purge worker must use a server-only service-role key and a dedicated bearer secret. Neither secret may be committed to the repository or exposed through a `NEXT_PUBLIC_` variable.
- Storage deletion must use the Supabase Storage API, not direct SQL deletes from `storage.objects`.
- Purge operations must be idempotent, auditable, and retryable. Do not delete storage objects until the database purge has been preflighted and the deletion order is safe.
- Keep the manual, user-requested 30-day deletion workflow distinct from the 180/90/30 inactivity lifecycle.

## Important database constraint

The current schema has restrictive foreign keys from `public.users` to account-deletion history, financial records, reports, moderation records, messages, and other audit-related tables. Deleting an Auth identity directly can therefore fail. The current privacy/data-protection copy also allows retention of certain financial, legal, safety, moderation, and security records where required.

Before enabling the irreversible purge worker in production, the project must define whether legally required records are deleted or minimally anonymized/retained. The purge implementation must then handle those relationships explicitly and must not report success if the Auth identity or any in-scope storage/content data remains.

## Rollout checklist

- [x] Add lifecycle state and timestamps to the database model.
- [x] Schedule 180-day pause and 90-day deletion-pending transitions.
- [x] Add owner recovery RPC and recovery page.
- [x] Route password and OAuth sign-ins for paused/deletion-pending accounts to recovery.
- [x] Add initial database transition tests.
- [ ] Enforce paused-state read-only behavior across every mutable domain and storage upload.
- [ ] Finalize retention/anonymization policy for restrictive financial, moderation, report, and audit references.
- [ ] Implement and test transactional database purge preparation.
- [ ] Implement idempotent storage/Auth purge worker only after the purge contract is finalized.
- [ ] Configure worker secret and schedule in deployment environments.
- [ ] Run database security tests, lint/build, and browser E2E tests.
- [ ] Verify the full lifecycle with disposable accounts before enabling it for real users.
