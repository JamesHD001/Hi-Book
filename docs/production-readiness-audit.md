# Hi!Book 2.0 — Critical User-Journey Production Audit

## Purpose

This audit checks the critical MVP user journeys against the current web implementation and identifies where static repository review is sufficient versus where a real authenticated browser session is required.

This is a repository audit plus an E2E harness definition. The E2E workflow uses a disposable local Supabase instance and never uses production credentials or production user data.

## E2E progress

The Playwright suite includes a deterministic two-user fixture with independent browser contexts. The cross-user suite exercises the real UI for follow/unfollow, public and followers-only post visibility, post likes/comments, valid post media upload, direct messaging, realtime message delivery, reporting, discovery, and block enforcement. The moderation workflow has a dedicated moderator fixture and now exercises report review, assignment, internal notes, moderation action execution, and user appeal submission. The account lifecycle suite exercises scheduling, cancellation, and expiry-driven access restriction.

The cross-user browser suite already verifies profile-image upload and private signed-URL delivery, message unread-to-read state, and media-post upload/realtime delivery. The account-lifecycle suite now includes a browser check for the expired-deletion worker's restricted-account boundary; pgTAP separately verifies the database lifecycle transitions. That new browser check still needs a fresh CI run. Moderator-role and appeal workflows are also covered by browser tests.

The responsive/accessibility production audit now runs against a 390×844 viewport and checks core authenticated routes for horizontal overflow, unnamed controls, and missing image alternatives. That audit passes in CI.

Authenticated mutation abuse controls are now enforced inside PostgreSQL rather than relying on browser-side throttling. The database gate covers post creation, comments, direct messages, follows, post/comment likes, post shares, reports, and blocks with per-user rolling windows. The rate-limit state is private to the database and the helper is not executable by anonymous or authenticated API roles. The database security suite verifies both rule/trigger coverage and actual rejection behavior, and the full two-user E2E suite still passes with the limits enabled.

The database security suite verifies that the account-deletion worker is installed once on the 15-minute schedule and executable only by `service_role`; it also exercises an expired job's lifecycle transition. This verifies the migration-defined scheduler contract, not successful execution of Supabase's production scheduler.

Deployment-boundary controls remain a separate operational concern: IP-level throttling, Supabase Auth/provider limits for unauthenticated authentication traffic, reverse-proxy enforcement, observability, backups, and restore procedures still require production-environment verification.

A controlled production deployment checklist is now maintained in `docs/production-deployment-checklist.md`. It explicitly separates repository/CI evidence from controls that require the real hosting and Supabase environments.

The repository's Next.js configuration also defines the intended baseline security headers: HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and disabled DNS prefetching. These are repository configuration facts; actual production delivery of those headers still requires an HTTP-level check against the deployed domain.

## Journey matrix

| Journey | Repository status | Result | Follow-up |
|---|---|---|---|
| Sign up | Implemented | 🟢 | Automated validation coverage added; full valid signup is exercised against disposable local Supabase. |
| Email verification | Implemented | 🟢 | Callback validates the local `next` path and redirects safely. Provider-specific email delivery still requires a later integration environment. |
| Onboarding | Implemented | 🟢 | Completion is server-side through `complete_registration`; the E2E fixture completes registration for both disposable test users. |
| Authenticated community | Implemented | 🟢 | Protected by `requireActiveUser`; automated authenticated navigation coverage added. |
| Profile/privacy | Implemented | 🟢 | Multi-table persistence now uses the transactional `update_profile_atomic` RPC; live persistence testing is covered. |
| Follow/block/report | Implemented | 🟢 | Two independent browser sessions exercise follow, unfollow, report, discovery, and block enforcement. |
| Posts/media | Implemented | 🟢 | Cross-user E2E verifies public and followers-only post visibility, image-post creation, profile-image persistence, crop/zoom controls, and private signed avatar delivery. |
| Feed | Implemented | 🟢 | Batched related reads and server-side authorization are present; cross-user post visibility is exercised. |
| Discovery | Implemented | 🟢 | Two-user discovery and post-block disappearance are covered; broader privacy permutations remain required. |
| Messaging | Implemented | 🟢 | Two-user permitted conversation, realtime delivery, unread-to-read state, and blocked-send enforcement are covered through independent sessions. |
| Notifications | Implemented | 🟢 | Authenticated notifications surface is covered; live notification delivery remains required. |
| Moderation | Implemented | 🟢 | Explicit moderation action/appeal permissions are enforced server-side, and the browser workflow now covers report review, assignment, action execution, and appeal submission. |
| Account lifecycle/deletion | Implemented | 🟢 | Scheduling/cancellation and expiry-driven restriction are verified through the browser; pgTAP covers the trusted worker transition. |

## High-severity findings

### H-01 — Profile updates are not atomic — Remediated

`web/components/profile/ProfileEditor.tsx` now sends database-backed profile changes through the `update_profile_atomic` PostgreSQL RPC. Avatar upload remains separately compensated if persistence fails.

### H-02 — Production-environment verification remains in progress

A disposable E2E harness, authenticated journey suite, and true two-user mutation suite cover the sensitive browser journeys above. A new expired-account browser check and scheduler privilege assertions are implemented but need fresh CI results. Production backup/restore, durable monitoring, deployment configuration, and edge/auth abuse controls still require evidence from the live provider environments.

## Required E2E scenarios

1. New user signs up with valid data.
2. New user cannot activate with invalid age, invalid country code, weak password, or missing legal acceptance.
3. Verified user completes onboarding and reaches the community.
4. Inactive/uncompleted users cannot access protected MVP pages.
5. User updates profile and privacy settings, refreshes, and verifies persistence. **Covered.**
6. User uploads a profile image and verifies the signed image remains private. **Covered through two independent browser sessions.**
7. User follows another user and verifies both sides see the correct relationship state. **Covered with two independent sessions.**
8. User blocks another user and verifies blocked visibility, interaction, discovery, and messaging barriers. **Covered with two independent sessions.**
9. User reports content/user and verifies the report enters the moderation workflow. **Covered, including moderator-side review and action execution.**
10. User creates a valid post and verifies feed visibility follows privacy/block rules. **Covered for text posts and followers-only visibility.**
11. User attempts invalid/empty post content and receives a safe failure. **Covered.**
12. User comments, likes, and removes allowed interactions. **Comment and post-like creation covered; removal path remains pending.**
13. User discovers another user according to discoverability/privacy settings. **Cross-user discovery and post-block disappearance covered; broader privacy permutations remain pending.**
14. User starts a permitted direct conversation and sends a message. **Covered.**
15. A blocked/disallowed participant cannot access the conversation or send messages. **Blocked send boundary covered.**
16. User sees unread/read state and notification updates correctly. **Two-user unread-to-read state is covered; live notification delivery remains a separate production verification.**
17. Moderator can perform allowed moderation actions but cannot exceed assigned permissions. **Role-based browser workflow is covered for moderator access, assignment, notes, and action execution.**
18. User submits an appeal and sees the correct appeal state. **Covered through the real `/appeals` UI after a moderation action is applied.**
19. User starts account deletion and verifies grace-period behavior. **Scheduling/cancellation are covered; expiry-driven access restriction has a new browser test awaiting CI. Worker transition details are covered by pgTAP.**
20. User cannot use restricted financial/moderation/admin operations outside their authorization boundary. **Database coverage exists; browser matrix remains pending.**
21. Authenticated high-volume mutations are rejected after their configured per-user rate limit. **Covered at the PostgreSQL boundary by pgTAP; full two-user E2E remains green with controls enabled.**

## Exit criteria for this gate

The production-readiness gate should not be marked green until:

- [x] H-01 is remediated.
- [x] Disposable local-Supabase E2E environment exists.
- [x] Critical journeys pass in repeatable browser tests currently covered by the suite.
- [x] Cross-user privacy/block/discovery/messaging matrix is implemented in the E2E suite.
- [x] Cross-user E2E suite passes in CI.
- [x] Mobile viewport audit passes.
- [x] Accessibility audit passes.
- [x] Authenticated mutation rate-limit/abuse controls are verified at the database boundary.
- [ ] Deployment/IP/auth-provider abuse controls are verified in a production-like boundary.
- [ ] Observability, backups, restore, and deployment procedures are verified.
- [ ] 13–17 safety requirements are finalized and tested before public launch.
- [x] Existing browser coverage includes profile-image upload/private signed delivery, explicit unread/read-state transitions, media-post upload, realtime delivery, moderator workflow, and appeal submission.
- [ ] New account-deletion expiry browser check passes in local-Supabase E2E CI.
- [ ] Re-run database and E2E CI after the latest verification additions.

The overall production-readiness gate remains **open** until the remaining E2E domains and operational checks are completed.
