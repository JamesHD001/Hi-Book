# Hi!Book 2.0 — Critical User-Journey Production Audit

## Purpose

This audit checks the critical MVP user journeys against the current web implementation and identifies where static repository review is sufficient versus where a real authenticated browser session is required.

This is a repository audit plus an E2E harness definition. The E2E workflow uses a disposable local Supabase instance and never uses production credentials or production user data.

## Journey matrix

| Journey | Repository status | Result | Follow-up |
|---|---|---|---|
| Sign up | Implemented | 🟢 | Automated validation coverage added; full valid signup is exercised against disposable local Supabase. |
| Email verification | Implemented | 🟢 | Callback validates the local `next` path and redirects safely. Provider-specific email delivery still requires a later integration environment. |
| Onboarding | Implemented | 🟢 | Completion is server-side through `complete_registration`; the E2E fixture completes registration for the disposable test user. |
| Authenticated community | Implemented | 🟢 | Protected by `requireActiveUser`; automated authenticated navigation coverage added. |
| Profile/privacy | Implemented | 🟢 | Multi-table persistence now uses the transactional `update_profile_atomic` RPC; Storage upload remains separate and failed persistence is compensated by removing the newly uploaded object. Live interaction testing still required. |
| Follow/block/report | Implemented | 🟢 | Database authorization is the final enforcement boundary. Cross-user interaction testing remains required. |
| Posts/media | Implemented | 🟢 | Database validation and private media controls are present. Live upload/error testing remains required. |
| Feed | Implemented | 🟢 | Batched related reads and server-side authorization are present. |
| Discovery | Implemented | 🟢 | Batched profile/avatar access is present. Privacy behavior still requires live matrix testing. |
| Messaging | Implemented | 🟢 | Inbox uses the latest-per-conversation server-side query/RPC. Conversation access remains database-enforced. Live realtime/read-state testing remains required. |
| Notifications | Implemented | 🟢 | Actor/profile and avatar reads are batched. Live notification delivery testing remains required. |
| Moderation | Implemented | 🟢 | Explicit moderation action/appeal permissions are enforced server-side. Human-role testing remains required. |
| Account lifecycle/deletion | Implemented | 🟠 | Database deletion/retention controls are verified, but the complete user-facing deletion journey needs live verification, including grace-period behavior and restricted account states. |

## High-severity findings

### H-01 — Profile updates are not atomic — Remediated

`web/components/profile/ProfileEditor.tsx` now uploads a new avatar separately and sends all database-backed profile changes through the `update_profile_atomic` PostgreSQL RPC. The RPC derives the authenticated user from `auth.uid()`, validates the payload, and updates the profile, country, privacy settings, languages, and interests in one database transaction. If the database operation fails after an avatar upload, the client removes the newly uploaded object as compensation.

The database contract is covered by `supabase/tests/database/12_profile_atomic_update_security.sql`.

### H-02 — Browser-level verification remains in progress

A disposable E2E harness is now present. It starts a fresh local Supabase stack, creates/completes a dedicated test user, runs Playwright against the local Next.js app, and tears the Supabase stack down afterward.

The first automated slice covers public navigation, registration validation, invalid login handling, authenticated community access, protected-route redirects, and the 404 boundary. The remaining cross-user and mutation-heavy journeys still require implementation in the E2E suite.

## Medium-priority findings

### M-01 — Accessibility requires browser-level verification

The source uses semantic labels and ARIA status/alert patterns in important forms, but keyboard navigation, focus order, screen-reader announcements, contrast, reduced motion, and modal behavior require browser-level testing.

### M-02 — Responsive behavior requires viewport testing

The application uses responsive Tailwind classes across core surfaces, but mobile behavior cannot be conclusively verified from static source inspection alone. Test at minimum narrow mobile, large mobile/tablet, and desktop widths.

### M-03 — Abuse/rate-limit controls require deployment verification

Application and database authorization are present, but effective abuse protection depends on the deployed request boundary. Verify rate limits for authentication, posting, messaging, reports, uploads, and other mutation-heavy endpoints.

## Required E2E scenarios

1. New user signs up with valid data.
2. New user cannot activate with invalid age, invalid country code, weak password, or missing legal acceptance.
3. Verified user completes onboarding and reaches the community.
4. Inactive/uncompleted users cannot access protected MVP pages.
5. User updates profile and privacy settings, refreshes, and verifies persistence.
6. User uploads a profile image and verifies the signed image remains private.
7. User follows another user and verifies both sides see the correct relationship state.
8. User blocks another user and verifies blocked visibility, interaction, discovery, and messaging barriers.
9. User reports content/user and verifies the report enters the moderation workflow.
10. User creates a valid post and verifies feed visibility follows privacy/block rules.
11. User attempts invalid/empty post content and receives a safe failure.
12. User comments, likes, and removes allowed interactions.
13. User discovers another user according to discoverability/privacy settings.
14. User starts a permitted direct conversation and sends a message.
15. A blocked/disallowed participant cannot access the conversation or send messages.
16. User sees unread/read state and notification updates correctly.
17. Moderator can perform allowed moderation actions but cannot exceed assigned permissions.
18. User submits an appeal and sees the correct appeal state.
19. User starts account deletion and verifies grace-period behavior.
20. User cannot use restricted financial/moderation/admin operations outside their authorization boundary.

## Exit criteria for this gate

The production-readiness gate should not be marked green until:

- [x] H-01 is remediated.
- [x] Disposable local-Supabase E2E environment exists.
- [ ] Critical journeys pass in automated or repeatable browser tests.
- [ ] Cross-user privacy/block/discovery/messaging matrix passes.
- [ ] Mobile viewport audit passes.
- [ ] Accessibility audit passes.
- [ ] Rate-limit/abuse controls are verified at the deployment boundary.
- [ ] Observability, backups, restore, and deployment procedures are verified.
- [ ] 13–17 safety requirements are finalized and tested before public launch.
- [ ] Database and web CI are green after all production-readiness changes.
