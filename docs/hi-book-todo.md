# Hi!Book 2.0 — Current TODO

Updated: 2026-09-07

## Completed

- [x] Authentication and account foundation
- [x] Profile/privacy foundation
- [x] Follow/unfollow, followers/following
- [x] Blocking and reporting
- [x] Notifications foundation
- [x] Global people discovery
- [x] Post composer and private image media
- [x] Home/following/explore feed
- [x] Post likes
- [x] Comments, one-level replies, comment likes
- [x] External and internal post sharing
- [x] 1:1 messaging
- [x] Realtime messaging and read state
- [x] Moderation report-to-case pipeline
- [x] Moderation queue and case detail UI
- [x] Moderator notes and action UI
- [x] Server-side moderation action enforcement
- [x] Temporary USER_RESTRICTED authorization state
- [x] User-facing moderation appeal submission
- [x] Moderator appeal review RPC
- [x] Moderation audit entries and user moderation notifications

## Current gate

- [ ] Supabase migration reset and full pgTAP suite passes for the latest moderation enforcement migrations
- [ ] Web lint/build passes after the appeals UI changes
- [ ] Resolve any CI regressions before advancing the domain

## Next implementation

- [ ] Finish moderation appeal review UI
- [ ] Add explicit moderation status/banner UX for restricted/suspended accounts
- [ ] Expand USER_RESTRICTED enforcement beyond messaging to every state-changing social/content workflow
- [ ] Add cross-domain moderation regression tests for posts, comments, follows, likes, shares, and discovery
- [ ] Complete deletion/retention CI gate
- [ ] Run final cross-domain security audit

## After safety gate

- [ ] Account deletion UI and lifecycle worker integration
- [ ] Notification preference UX and delivery adapters
- [ ] Media/message image upload hardening and signed URL lifecycle
- [ ] Full integration/e2e test coverage
- [ ] Production deployment hardening
- [ ] Observability and operational dashboards
- [ ] MVP launch readiness review

## Deferred post-MVP

- [ ] Group messaging
- [ ] Voice messages
- [ ] Voice/video calls
- [ ] Live streaming
- [ ] HBC purchases and creator economy
- [ ] Gifts and payouts
- [ ] Subscriptions/premium features
- [ ] Mobile app
- [ ] Advanced recommendation/ranking systems
