# Inactive Account Lifecycle

## Product rules

Hi!Book automatically manages accounts that have not completed a successful login:

1. **180 days inactive:** set `users.lifecycle_state = 'PAUSED'`. The account remains visible according to existing profile/privacy rules. Account data remains stored, but the owner must complete an ownership-verification step to resume use.
2. **90 days paused:** set `lifecycle_state = 'PENDING_DELETION'`, set `account_status = 'DEACTIVATED'`, hide the account from other users, and start a 30-day recovery window.
3. **During recovery:** the owner proves ownership through the normal authenticated sign-in flow plus any required step-up verification, then uses the recovery screen to reactivate. The recovery RPC cancels the automatic deletion request and restores account visibility.
4. **After the recovery deadline:** a trusted purge worker permanently deletes personal data and user content, removes storage objects and the authentication identity, and anonymizes only records approved for legal/operational retention. The account is not marked permanently deleted until the purge succeeds and verification checks pass.

The inactivity clock uses Supabase Auth's `last_sign_in_at`, falling back to `auth.users.created_at` for accounts that have never successfully logged in. Routine background refreshes and token refreshes do not count as a successful user login. The database scheduler checks every 15 minutes. A separate trusted worker must run at least hourly to complete expired purges.

## Approved retention policy: Option B

- Delete profile fields, credentials/identity, user-generated posts and comments, media, personal messages where deletion is consistent with product/legal obligations, reactions, follows, preferences, and other user-linked personal data.
- Delete Storage objects using the Supabase Storage API, including every bucket and path owned by the account.
- Remove the Supabase Auth identity after database and storage cleanup can complete safely.
- For financial, payment, purchase, wallet/coin, fulfillment, legal acceptance, safety report, moderation, and security/audit records that must be retained, remove direct personal identifiers and replace user references with a stable non-reversible deletion/anonymization token only where the schema and operational requirements allow it.
- Retained records must not contain email, phone, display name, avatar URL, public profile URL, message/post body, precise location, authentication identifiers, or another direct identifier unless an approved legal requirement specifically requires it.
- Do not retain raw message or content bodies merely because they appear in moderation evidence. Where evidence must be retained, apply a separately approved minimization/redaction policy.
- Never delete financial/legal/safety records that are subject to a hold or mandatory retention period. Never claim that a record was anonymized if other retained fields can reasonably re-identify the user.
- Document each retained record category, its purpose, retention duration, and owner in the data-retention inventory. The applicable legal retention period must be confirmed before production rollout.

## Security requirements

- Lifecycle state and timestamps are server-controlled; authenticated clients cannot update them directly.
- Recovery requires the authenticated owner. If the account is paused or scheduled for deletion, require a fresh sign-in and, where configured, step-up email/phone/provider verification.
- Paused accounts remain visible under existing privacy rules, but writes to social content and account settings are blocked.
- Accounts pending deletion are deactivated and hidden through existing account visibility rules.
- The purge worker must use a server-only service-role key and a dedicated bearer secret. Neither secret may be committed to the repository or exposed through a `NEXT_PUBLIC_` variable.
- Storage deletion must use the Supabase Storage API, not direct SQL deletes from `storage.objects`.
- Purge operations must be idempotent, auditable, and retryable. Perform a preflight of restrictive foreign keys and dependencies before deleting any data.
- Keep the manual, user-requested 30-day deletion workflow distinct from the 180/90/30 inactivity lifecycle. Shared purge primitives are acceptable only when they preserve each workflow's distinct consent and timing rules.

## Database relationships identified during audit

Restrictive references to `public.users` include account deletion history, admin role assignments, appeals, wallets, fulfillments, gift transactions, HBC recovery obligations, messages, moderation records, payments, purchases, reports, and legal-acceptance records. Several actor references use `ON DELETE SET NULL`; profile, social, and preference rows often use `ON DELETE CASCADE`.

Before a purge is enabled, explicitly classify every restrictive reference as:
1. delete with the account,
2. anonymize and retain,
3. retain with a pseudonymous reference under an approved retention rule, or
4. hold deletion pending legal/safety review.

A single Auth-user deletion call is not a complete purge. It can fail because of restrictive relationships and can leave storage objects or user-generated data behind. The purge worker must use a server-side database procedure to apply the approved plan transactionally where possible, remove Storage objects through the Storage API, then delete the Auth identity and verify the result. If a phase fails, preserve a private retryable purge job and do not report completion.

## Rollout checklist

- [x] Add lifecycle state and timestamps to the database model.
- [x] Schedule 180-day pause and 90-day deletion-pending transitions.
- [x] Add owner recovery RPC and recovery page.
- [x] Route password and OAuth sign-ins for paused/deletion-pending accounts to recovery.
- [x] Add initial database transition tests.
- [x] Approve Option B: delete personal data and user content; anonymize only records that must legally or operationally be retained.
- [ ] Enforce paused-state read-only behavior across every mutable domain and storage upload.
- [ ] Build a complete retention inventory for every restrictive foreign key and storage bucket.
- [ ] Implement a transactional database purge procedure with explicit per-table delete/anonymize/retain rules.
- [ ] Implement idempotent Storage/Auth purge worker and private retry/audit trail.
- [ ] Add tests proving direct identifiers and personal content are removed and retained records are non-identifying.
- [ ] Configure worker secret and schedule in deployment environments.
- [ ] Run database security tests, web lint/build, and browser E2E tests.
- [ ] Verify the full lifecycle with disposable accounts before enabling it for real users.
