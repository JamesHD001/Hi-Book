# Hi!Book 2.0 — Critical User-Journey Production Audit

## Purpose

This audit checks the critical MVP user journeys against the current web implementation and identifies where static repository review is sufficient versus where a real authenticated browser session is required.

This is a repository audit plus an E2E harness definition. The E2E workflow uses a disposable local Supabase instance and never uses production credentials or production user data.

## E2E progress

The Playwright suite now includes a deterministic two-user fixture with independent browser contexts. The cross-user suite exercises the real UI for follow/unfollow, public and followers-only post visibility, post likes/comments, direct messaging, reporting, discovery, and block enforcement. The fixture resets each test user's owned social/content state before the run so repeated local runs remain deterministic.

The remaining E2E gaps are valid media uploads, realtime message/read-state verification, moderation-role workflows, and account deletion/grace-period workflows.

## Journey matrix

| Journey | Repository status | Result | Follow-up |
|---|---|---|---|
| Sign up | Implemented | 🟢 | Automated validation coverage added; full valid signup is exercised against disposable local Supabase. |
| Email verification | Implemented | 🟢 | Callback validates the local `next` path and redirects safely. Provider-specific email delivery still requires a later integration environment. |
| Onboarding | Implemented | 🟢 | Completion is server-side through `complete_registration`; the E2E fixture completes registration for both disposable test users. |
| Authenticated community | Implemented | 🟢 | Protected by `requireActiveUser`; automated authenticated navigation coverage added. |
| Profile/privacy | Implemented | 🟢 | Multi-table persistence now uses the transactional `update_profile_atomic` RPC; live persistence testing is covered. |
| Follow/block/report | Implemented | 🟢 | Two independent browser sessions now exercise follow, unfollow, report, block, discovery, and post/messaging barriers. |
| Posts/media | Implemented | 🟢 | Cross-user E2E verifies public and followers-only post visibility plus likes/comments; valid media creation remains required. |
| Feed | Implemented | 🟢 | Batched related reads and server-side authorization are present; cross-user post visibility is now exercised. |
| Discovery | Implemented | 🟢 | Two-user discovery and post-block disappearance are covered; broader privacy permutations remain required. |
| Messaging | Implemented | 🟢 | Two-user permitted conversation, message delivery through independent sessions, and blocked-send enforcement are covered; realtime/read-state assertions remain required. |
| Notifications | Implemented | 🟢 | Authenticated notifications surface is covered; live notification delivery remains required. |
| Moderation | Implemented | 🟢 | Explicit moderation action/appeal permissions are enforced server-side. Human-role testing remains required. |
| Account lifecycle/deletion | Implemented | 🟠 | Database deletion/retention controls are verified, but the complete user-facing deletion journey needs live verification, including grace-period behavior and restricted account states. |

## High-severity findings

### H-01 — Profile updates are not atomic — Remediated

`web/components/profile/ProfileEditor.tsx` now sends database-backed profile changes through the `update_profile_atomic` PostgreSQL RPC. Avatar upload remains separately compensated if persistence fails.

### H-02 — Browser-level verification remains in progress

A disposable E2E harness, authenticated journey suite, and true two-user mutation suite now exist. Remaining high-value coverage is concentrated in media, realtime/read state, moderation, account lifecycle, and operational audits.

## Required E2E scenarios

1. New user signs up with valid data.
2. New user cannot activate with invalid age, invalid country code, weak password, or missing legal acceptance.
3. Verified user completes onboarding and reaches the community.
4. Inactive/uncompleted users cannot access protected MVP pages.
5. User updates profile and privacy settings, refreshes, and verifies persistence. **Covered.**
6. User uploads a profile image and verifies the signed image remains private.
7. User follows another user and verifies both sides see the correct relationship state. **Covered with two independent sessions.**
8. User blocks another user and verifies blocked visibility, interaction, discovery, and messaging barriers. **Covered with two independent sessions.**
9. User reports content/user and verifies the report enters the moderation workflow. **Report submission covered; moderator-side workflow remains pending.**
10. User creates a valid post and verifies feed visibility follows privacy/block rules. **Covered for text posts and followers-only visibility.**
11. User attempts invalid/empty post content and receives a safe failure. **Covered.**
12. User comments, likes, and removes allowed interactions. **Comment and post-like creation covered; removal path remains pending.**
13. User discovers another user according to discoverability/privacy settings. **Cross-user discovery and post-block disappearance covered; broader privacy permutations remain pending.**
14. User starts a permitted direct conversation and sends a message. **Covered.**
15. A blocked/disallowed participant cannot access the conversation or send messages. **Blocked send boundary covered.**
16. User sees unread/read state and notification updates correctly. **Pending realtime/read-state coverage.**
17. Moderator can perform allowed moderation actions but cannot exceed assigned permissions. **Pending role-based browser workflow.**
18. User submits an appeal and sees the correct appeal state. **Pending browser workflow.**
19. User starts account deletion and verifies grace-period behavior. **Pending.**
20. User cannot use restricted financial/moderation/admin operations outside their authorization boundary. **Database coverage exists; browser matrix remains pending.**

## Exit criteria for this gate

The production-readiness gate should not be marked green until:

- [x] H-01 is remediated.
- [x] Disposable local-Supabase E2E environment exists.
- [ ] Critical journeys pass in automated or repeatable browser tests.
- [x] Cross-user privacy/block/discovery/messaging matrix is implemented in the E2E suite.
- [ ] Cross-user E2E suite passes in CI.
- [ ] Mobile viewport audit passes.
- [ ] Accessibility audit passes.
- [ ] Rate-limit/abuse controls are verified at the deployment boundary.
- [ ] Observability, backups, restore, and deployment procedures are verified.
- [ ] 13–17 safety requirements are finalized and tested before public launch.
- [ ] Database and web CI are green after all production-readiness changes.
