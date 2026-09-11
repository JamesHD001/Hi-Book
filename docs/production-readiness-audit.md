# Hi!Book 2.0 — Critical User-Journey Production Audit

## Purpose

This audit checks the critical MVP user journeys against the current web implementation and identifies where static repository review is sufficient versus where a real authenticated browser session is required.

This is a repository audit plus an E2E harness definition. The E2E workflow uses a disposable local Supabase instance and never uses production credentials or production user data.

## E2E progress

The Playwright suite now includes a second authenticated journey suite covering core navigation, profile validation and persistence, safe empty-post behavior, discovery safety controls, messaging boundaries, and notifications. These tests run against the disposable local Supabase environment configured by `.github/workflows/e2e.yml`.

This does **not** yet prove the full cross-user security matrix. Tests that mutate relationships between two independently provisioned users, exercise valid media uploads, exercise realtime message/read state, or verify account deletion grace periods remain outstanding.

## Journey matrix

| Journey | Repository status | Result | Follow-up |
|---|---|---|---|
| Sign up | Implemented | 🟢 | Automated validation coverage added; full valid signup is exercised against disposable local Supabase. |
| Email verification | Implemented | 🟢 | Callback validates the local `next` path and redirects safely. Provider-specific email delivery still requires a later integration environment. |
| Onboarding | Implemented | 🟢 | Completion is server-side through `complete_registration`; the E2E fixture completes registration for the disposable test user. |
| Authenticated community | Implemented | 🟢 | Protected by `requireActiveUser`; automated authenticated navigation coverage added. |
| Profile/privacy | Implemented | 🟢 | Multi-table persistence now uses the transactional `update_profile_atomic` RPC; live persistence testing is covered. |
| Follow/block/report | Implemented | 🟢 | UI exposure of follow/block/report controls is covered; true cross-user mutation barriers remain required. |
| Posts/media | Implemented | 🟢 | Composer/empty-submit behavior is covered; valid post/media creation and privacy enforcement remain required. |
| Feed | Implemented | 🟢 | Batched related reads and server-side authorization are present. |
| Discovery | Implemented | 🟢 | Discovery surface and safety controls are covered; discoverability/privacy matrix remains required. |
| Messaging | Implemented | 🟢 | Inbox boundary is covered; cross-user send/block/read-state and realtime testing remain required. |
| Notifications | Implemented | 🟢 | Authenticated notifications surface is covered; live notification delivery remains required. |
| Moderation | Implemented | 🟢 | Explicit moderation action/appeal permissions are enforced server-side. Human-role testing remains required. |
| Account lifecycle/deletion | Implemented | 🟠 | Database deletion/retention controls are verified, but the complete user-facing deletion journey needs live verification, including grace-period behavior and restricted account states. |

## High-severity findings

### H-01 — Profile updates are not atomic — Remediated

`web/components/profile/ProfileEditor.tsx` now sends database-backed profile changes through the `update_profile_atomic` PostgreSQL RPC. Avatar upload remains separately compensated if persistence fails.

### H-02 — Browser-level verification remains in progress

A disposable E2E harness and authenticated journey suite now exist. Remaining high-value coverage is the cross-user security matrix and mutation-heavy workflows.

## Required E2E scenarios

1. New user signs up with valid data.
2. New user cannot activate with invalid age, invalid country code, weak password, or missing legal acceptance.
3. Verified user completes onboarding and reaches the community.
4. Inactive/uncompleted users cannot access protected MVP pages.
5. User updates profile and privacy settings, refreshes, and verifies persistence. **Covered.**
6. User uploads a profile image and verifies the signed image remains private.
7. User follows another user and verifies both sides see the correct relationship state. **Pending cross-user fixture.**
8. User blocks another user and verifies blocked visibility, interaction, discovery, and messaging barriers. **Pending cross-user fixture.**
9. User reports content/user and verifies the report enters the moderation workflow. **Pending workflow fixture.**
10. User creates a valid post and verifies feed visibility follows privacy/block rules. **Pending mutation/privacy fixture.**
11. User attempts invalid/empty post content and receives a safe failure. **Covered.**
12. User comments, likes, and removes allowed interactions.
13. User discovers another user according to discoverability/privacy settings. **Surface covered; privacy matrix pending.**
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
