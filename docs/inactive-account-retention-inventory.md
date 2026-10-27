# Inactive Account Retention Inventory

**Status:** Initial schema inventory, not yet approved for production purge.  
**Policy basis:** Approved Option B: delete personal data and user content; anonymize only records that must legally or operationally be retained.

This inventory is based on the live Supabase schema inspected on 2026-10-27. It records foreign-key relationships to `public.users` that use restrictive deletion behavior. It does not claim that anonymization is already implemented. No retention durations are specified where legal/product owners have not confirmed them.

## Proposed disposition of restrictive references

| Table / column | Current FK behavior | Proposed disposition | Required pre-purge decision |
|---|---|---|---|
| `account_deletion_request.user_id` | RESTRICT | Retain the minimal deletion audit record with a non-reversible deletion token; remove the direct user reference only after the workflow is complete. | Preserve enough state to audit completion without retaining identity. |
| `admin_user_roles.user_id` | RESTRICT | Remove the user's active role assignment. | Confirm whether the account is an active administrator; require a privileged review and transfer of responsibilities before deletion. |
| `admin_user_roles.assigned_by` | RESTRICT | Retain assignment audit with a pseudonymous actor reference where required. | Distinguish the deleted user as assignee from a different, still-active assigning administrator. |
| `appeals.appellant_id` | RESTRICT | Retain only when required for safety/process integrity; otherwise delete. If retained, anonymize the appellant reference and minimize appeal content. | Confirm appeal retention period and whether an appeal is open or under hold. |
| `appeals.reviewed_by` | RESTRICT | Preserve a still-active reviewer identity; pseudonymize only if that reviewer is the account being deleted and retention is required. | Do not anonymize unrelated users' identities. |
| `coin_wallets.user_id` | RESTRICT | Retain only the minimum ledger/accounting state required for reconciliation; remove direct identity and replace the user reference with a deletion token when safe. | Block final purge while a balance or unresolved coin obligation requires action. |
| `feature_flags.created_by` | RESTRICT | Retain configuration audit with pseudonymous actor reference if needed. | Confirm whether the user is a still-active administrator or operator. |
| `feature_flags.updated_by` | RESTRICT | Retain configuration audit with pseudonymous actor reference if needed. | Preserve active operators' identities; anonymize only the deleted actor. |
| `fulfillments.user_id` | RESTRICT | Retain necessary fulfillment/accounting records pseudonymously; remove direct identity when fulfillment and dispute obligations permit. | Hold final purge for incomplete fulfillment, refund, or dispute obligations. |
| `gift_transactions.sender_id` | RESTRICT | Retain the minimum transaction/ledger record required for accounting; pseudonymize the deleted sender reference. | Preserve transaction integrity and recipient rights; do not delete required financial history. |
| `gift_transactions.recipient_id` | RESTRICT | Retain the minimum transaction/ledger record required for accounting; pseudonymize the deleted recipient reference. | Preserve transaction integrity and sender rights; do not delete required financial history. |
| `hbc_recovery_obligations.user_id` | RESTRICT | Retain a pseudonymous obligation record while required; do not remove the obligation itself. | Hold final purge while an obligation remains open unless the product owner approves a safe transfer/settlement path. |
| `messages.sender_id` | RESTRICT | Delete personal message content and related media where legally/product appropriate; otherwise retain only a separately approved minimized/redacted record with pseudonymous sender reference. | Check legal/safety holds and conversation impact before removing messages. Never keep raw content solely because it exists. |
| `moderation_actions.performed_by` | RESTRICT | Retain required moderation audit with pseudonymous actor reference if the deleted user is the actor. | Preserve unrelated active moderator identities and required enforcement history. |
| `moderation_cases.assigned_to` | RESTRICT | Reassign open cases before deletion; pseudonymize closed historical assignment only if required. | Do not leave open cases assigned to a deleted account. |
| `moderation_evidence.created_by` | RESTRICT | Retain only evidence required by policy/hold; remove direct creator identity and minimize/redact evidence. | Establish evidence retention/hold rules before deletion. |
| `moderation_notes.author_id` | RESTRICT | Retain only required notes with pseudonymous author reference; redact unnecessary personal content. | Confirm moderation-note retention period and legal/safety holds. |
| `payments.user_id` | RESTRICT | Retain required payment/accounting records pseudonymously; remove direct identity where payment-provider/legal obligations permit. | Confirm provider reconciliation, dispute, refund, and statutory retention requirements. |
| `platform_configurations.updated_by` | RESTRICT | Preserve configuration audit with a pseudonymous actor reference if required. | Confirm the deleted user is not the only active configuration owner/operator. |
| `purchases.user_id` | RESTRICT | Retain minimum purchase/accounting record pseudonymously where required. | Confirm refunds, disputes, digital entitlements, and applicable retention requirements. |
| `reports.reporter_id` | RESTRICT | Retain safety reports only as required; anonymize reporter identity and redact unnecessary personal details. | Hold deletion/redaction where an active safety investigation requires identifiable information. |
| `reports.resolved_by` | RESTRICT | Preserve the identity of a different, still-active reviewer; pseudonymize only when the deleted account is the reviewer and retention is required. | Do not anonymize unrelated active reviewers. |
| `user_legal_acceptance.user_id` | RESTRICT | Retain only legally necessary acceptance evidence, using a pseudonymous token and minimized fields where permitted. | Legal owner must confirm which acceptance fields and retention period are mandatory. |

## Other relationship behavior observed

- Several profile, preference, social, and content tables reference `public.users` with `ON DELETE CASCADE`; the purge still needs explicit ordering and verification so personal content is not accidentally retained elsewhere.
- `admin_audit_logs.actor_id`, `analytics_events.user_id`, `moderation_audit_logs.actor_id`, and `telemetry_events.user_id` use `ON DELETE SET NULL`. Nulling a foreign key alone does **not** guarantee anonymization if payloads or metadata still contain names, email addresses, IP addresses, message text, or other identifying data.
- Storage buckets currently present are private buckets named `avatars`, `messages`, and `posts`. Purge must enumerate and remove every object owned by the account using the Supabase Storage API; bucket names and path conventions must be checked against actual objects before deletion.
- Other data tables such as `payment_webhook_events`, `payment_methods`, `refunds`, `financial_ledger_entries`, and `coin_transaction_entries` need a second-pass content/indirect-reference review even when they do not directly reference `public.users`.

## Release blockers

- [ ] Product/legal owner confirms retention durations and legal-hold handling for payments, purchases, legal acceptance, safety reports, moderation evidence, and audit records.
- [ ] Classify every restrictive reference as delete, anonymize/retain, pseudonymous retain, or hold for review in the purge implementation.
- [ ] Define how open wallets, HBC recovery obligations, fulfillment, disputes, and administrator assignments block or delay final deletion.
- [ ] Audit indirect identifiers and content in retained JSON payloads, webhook bodies, notes, reports, and moderation evidence.
- [ ] Implement an idempotent purge plan with retryable phases and a private audit trail.
- [ ] Verify no direct identifier or user-generated personal content remains after a successful purge.
- [ ] Keep the account in a private, non-recoverable purge-pending state if any required phase fails; never mark it permanently deleted before verification succeeds.

This is a technical inventory, not a legal determination. No account data is deleted or anonymized by this document.

## Second-pass indirect-content review

A schema-only review of text and JSON-capable columns found additional fields that need content-level minimization review before purge is implemented:

- `payment_webhook_events.payload`: provider webhook payload may contain transaction or payer identifiers. Retain only fields required for reconciliation, subject to provider/statutory requirements; do not assume a raw payload is safe to retain.
- `admin_audit_logs.metadata`, `moderation_audit_logs.metadata`, and `moderation_evidence.metadata`: inspect for embedded names, email/phone, IP addresses, user IDs, URLs, and raw user content before retaining or pseudonymizing.
- `analytics_events.properties`, `analytics_events.context`, and `telemetry_events.metadata`: remove or aggregate user-identifying properties where retention is not necessary; nulling `user_id` alone is insufficient.
- `posts.content`, `comments.content`, and `messages.content`: delete as user-generated content unless a specifically approved legal/safety hold requires a minimized/redacted copy.
- `appeals.reason`, `appeals.resolution`, `moderation_notes.content`, `reports.description`, and `refunds.reason`: these may contain free-text personal information; apply the approved retention/hold decision and redact unnecessary personal details.
- `financial_ledger_entries.description`, `payment_webhook_events.provider_reference`, and `refunds.provider_reference`: verify that references do not embed direct identifiers; preserve only required reconciliation keys.

This review inspects schema names and types only; it does not read or change user payloads. Content-level rules and retention periods remain release blockers.
