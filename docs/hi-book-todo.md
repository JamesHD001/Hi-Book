# Hi!Book 2.0 — Current TODO

## Current gate
- [x] Database migrations and pgTAP security suite green in CI.
- [x] Audit remaining web data-access paths for N+1 patterns.
- [x] Batch signed avatar/media URL generation on feed, messaging inbox, notifications, discovery, and social-list paths.
- [x] Harden messaging inbox latest-message retrieval with a server-side latest-per-conversation query/RPC and supporting index.
- [x] Complete moderation cross-domain authorization audit, including explicit action/appeal permissions and safe partial-appeal semantics.
- [x] Add/document deployment reverse-proxy protections appropriate to Vercel or self-hosted deployment.
- [ ] Re-run web CI after the performance and security hardening changes and fix any failures.
- [ ] Update `docs/hi-book-plan.md` with the completed architecture gates.

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

## Next major gates
1. Confirm the web CI gate is green on the current main branch.
2. Mark the completed architecture/security gates in `docs/hi-book-plan.md`.
3. Move into the next product/production-readiness milestone only after the web gate is green.
