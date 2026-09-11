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
- [ ] Remediate the profile editor's multi-operation partial-failure risk with an atomic server-side workflow.
- [ ] Add integration/end-to-end coverage for security-critical workflows.
- [ ] Verify responsive/mobile behavior across core MVP surfaces.
- [ ] Verify accessibility across core MVP surfaces.
- [ ] Audit rate limiting and abuse controls.
- [ ] Audit production observability, error reporting, backups, and deployment configuration.
- [ ] Fix all production blockers/high-severity findings.
- [ ] Re-run database and web CI after production-readiness fixes.
- [ ] Prepare a controlled production deployment checklist.

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
- [ ] Atomic profile update workflow
- [ ] Production-grade integration/e2e test coverage
- [ ] Minor-safety requirements for ages 13–17 finalized before public production launch
- [ ] Operational rate limiting/abuse protection verified
- [ ] Production observability and recovery procedures verified
- [ ] Responsive/accessibility audit completed

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
Remediate the profile update atomicity finding, establish the disposable E2E environment, and execute the critical journey matrix before treating the MVP as production-ready.
