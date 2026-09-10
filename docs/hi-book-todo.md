# Hi!Book 2.0 — Current TODO

## Current gate
- [x] Database migrations and pgTAP security suite green in CI.
- [x] Audit feed, messaging inbox, and notifications for application-level N+1 storage URL generation.
- [x] Batch signed avatar/media URL generation on feed, messaging inbox, and notifications.
- [ ] Audit remaining web data-access paths for N+1 patterns.
- [ ] Harden messaging inbox latest-message retrieval with a server-side latest-per-conversation query/RPC.
- [ ] Complete moderation cross-domain authorization audit, including partial appeal reversal semantics.
- [ ] Add/document deployment reverse-proxy protections appropriate to Vercel or self-hosted deployment.
- [ ] Re-run web CI after the performance changes and fix any failures.

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
1. Finish web N+1/data-access audit.
2. Finish moderation cross-domain audit.
3. Finish reverse-proxy/deployment security layer.
4. Verify web CI on current main.
5. Update `docs/hi-book-plan.md` with the completed architecture gates.
6. Move to the next MVP product domain only after the above gates are green.
