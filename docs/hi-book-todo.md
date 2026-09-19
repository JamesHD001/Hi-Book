# Hi!Book 2.0 — Current TODO

## Current gate — Production readiness
- [x] Database migrations and pgTAP security suite green in CI.
- [x] Audit remaining web data-access paths for N+1 patterns.
- [x] Batch signed avatar/media URL generation on feed, messaging inbox, notifications, discovery, and social-list paths.
- [x] Harden messaging inbox latest-message retrieval with a server-side latest-per-conversation query/RPC and supporting index.
- [x] Complete moderation cross-domain authorization audit, including explicit action/appeal permissions and safe partial-appeal semantics.
- [x] Add/document deployment reverse-proxy protections appropriate to Vercel or self-hosted deployment.
- [x] Re-run web CI after the performance and security hardening changes and confirm lint/build pass.
- [x] Update `docs/hi-book-plan.md` with the completed architecture/security gates.
- [x] Add global web error, loading, and not-found boundaries.
- [x] Perform repository-level audit of critical authenticated user journeys.
- [x] Document the E2E journey matrix and production-readiness exit criteria in `docs/production-readiness-audit.md`.
- [x] Remediate the profile editor's multi-operation partial-failure risk with an atomic server-side workflow.
- [x] Add database security coverage for the atomic profile update RPC.
- [x] Add a disposable local-Supabase Playwright E2E environment.
- [x] Add critical authentication/public journey coverage and failure-path checks.
- [x] Expand E2E coverage with authenticated profile/privacy, core navigation, post-composer failure, discovery safety controls, messaging boundaries, and notifications checks.
- [x] Add a deterministic two-user E2E fixture with independent browser sessions.
- [x] Exercise cross-user follow/unfollow, public and followers-only post visibility, post likes/comments, direct messaging, reporting, and block enforcement through the real UI.
- [x] Verify valid post media upload and realtime message delivery through independent browser sessions.
- [x] Verify moderator-role browser workflow, moderation action execution, and user appeal submission.
- [x] Verify account-deletion scheduling and cancellation during the grace period.
- [x] Verify profile-image upload persistence and private signed-URL delivery through independent browser sessions.
- [x] Add explicit unread/read-state E2E assertions.
- [x] Verify that a scheduled deletion places the account into the restricted/deactivated application state and that cancellation restores active access.
- [x] Add a server-only due-deletion completion RPC and database security coverage proving expired schedules transition to `COMPLETED` / `DELETED` with `deleted_at` recorded.
- [x] Verify the production scheduler/worker actually invokes due-deletion completion in the production Supabase project.
- [ ] Prove post-expiry browser behavior against the deployed environment with a controlled test account.
- [x] Verify the current production deployment serves `/api/health` with HTTP 200, `status: "ok"`, `Cache-Control: no-store`, and the configured security headers; Vercel reported no runtime error clusters in the preceding 24 hours.
- [x] Verify responsive/mobile behavior across core MVP surfaces.
- [x] Verify accessibility across core MVP surfaces.
- [x] Audit authenticated mutation rate limiting and abuse controls at the database boundary.
- [x] Add a manual/scheduled production smoke workflow for `/api/health`, HTTPS, cache control, and application security headers.
- [ ] Verify deployment-boundary/IP/auth-provider abuse controls and production observability, error reporting, backups, and deployment configuration.
- [x] Remediate confirmed production Supabase RLS/search_path/trigger-RPC exposure findings and remove confirmed duplicate indexes.
- [ ] Re-run the full production-readiness CI matrix after the remaining production-readiness fixes. The latest E2E attempt exposed a shared Playwright password-field selector regression; the affected journey specs have now been normalized to the deterministic `autocomplete="current-password"` selector. Web lint/build remained green.
- [x] Fix the current CI migration blocker caused by revoking a non-existent `rls_auto_enable()` function in the portable migration chain.
- [x] Prepare a controlled production deployment checklist.

## Authenticated UI sequence
- [x] Application shell/navigation wired into the protected layout.
- [x] Community/feed repository audit completed.
- [x] Community/feed responsive controls refined without replacing the existing feed architecture.
- [x] Discover repository/UI audit.
- [x] Profiles repository/UI audit.
- [x] Messages repository/UI audit.
- [x] Notifications repository/UI audit.
- [x] Settings/account repository/UI audit.

## MVP domains implemented
- [x] Authentication and account lifecycle foundation
- [x] Profiles and privacy settings
- [x] Follow / block / report
- [x] Posts and private media
- [x] Feed and discovery
- [x] Likes, comments, mentions, tags, shares
- [x] Notifications
- [x] 1:1 messaging and read state
- [x] Moderation queue, enforcement, and appeals

## Important launch blockers
- [x] Atomic profile update workflow
- [ ] Production-grade integration/e2e test coverage
- [ ] Minor-safety requirements for ages 13–17 finalized before public production launch
- [x] Database-level authenticated mutation rate limiting verified
- [ ] Production deployment-boundary abuse protection verified
- [ ] Production observability and recovery procedures verified
- [x] Responsive/accessibility audit completed

## Deferred / post-MVP
- [ ] HBC purchases and creator economy
- [ ] Gifts
- [ ] Payouts
- [ ] Subscriptions
- [ ] Group messaging
- [ ] Voice/video features
- [ ] Live streaming
- [ ] Advanced recommendation/ranking systems
- [ ] Additional media types

## Next major gate
Verify the production scheduler/worker for due-account-deletion processing and exercise post-expiry browser behavior against the deployed environment. The scheduler invocation and production liveness/security-header checks are verified; the disposable E2E gate still needs a fresh green run after the selector fixes. In parallel, use `docs/production-deployment-checklist.md` to collect evidence from the real hosting/Supabase environments for deployment-boundary abuse controls, observability, backups, restore procedures, and deployment configuration. The repository now has an optional manual/hourly production smoke check, but the operational gate remains open until the real production URL is configured and the external controls are actually verified.
