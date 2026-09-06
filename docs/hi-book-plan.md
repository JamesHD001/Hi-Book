# Hi!Book 2.0 — Project Plan

## 1. Vision

Hi!Book is a global social network designed to make it easier for people who are different to understand, communicate with, and connect with one another across distance, countries, cultures, languages, and backgrounds.

> **The goal isn't to make everyone the same; it is to make it easier for people who are different to understand and connect with one another.**

The product should encourage genuine human connection without relying on outrage-driven engagement, sensitive-attribute profiling, or invasive personalization.

---

## 2. Product Principles

- **Global by design:** country, language, culture, and interests are first-class discovery dimensions.
- **Privacy by default:** sensitive account information is private unless explicitly exposed through a safe public profile field.
- **User-controlled discovery:** users decide whether they are discoverable and what kinds of people/content they want to discover.
- **Safety is foundational:** blocking, reporting, moderation, privacy controls, and authorization are core infrastructure rather than later additions.
- **Server-authoritative security:** clients never decide permissions, prices, balances, payment success, moderation state, or account lifecycle state.
- **Source of truth separation:** transactional domains remain authoritative; feeds, notifications, discovery, and analytics are derived/read domains.
- **Auditability:** sensitive administrative, moderation, financial, and lifecycle operations must be traceable.
- **No premature complexity:** begin as a modular monolith and introduce additional services only when scale or product requirements justify them.

---

## 3. Technology Stack

### Web MVP
- Next.js
- TypeScript
- React
- Tailwind CSS

### Backend / Platform
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Realtime
- PostgreSQL Row Level Security (RLS)
- PostgreSQL functions/RPCs for server-controlled workflows

### Deployment
- Vercel
- Supabase

### Mobile
- React Native + Expo — post-MVP

### Future infrastructure
- Cloudflare R2 for heavy media if Supabase Storage becomes unsuitable at scale.
- Additional services only when justified by measurable requirements.

---

# 4. Development Strategy

The project is being developed in security-first stages.

1. Define product and data contracts.
2. Build the PostgreSQL schema.
3. Implement RLS and authorization boundaries.
4. Implement server-controlled transactional workflows.
5. Build automated database security tests.
6. Establish a green CI database gate.
7. Implement the application UI/API layer.
8. Add integration and end-to-end tests.
9. Harden deployment, observability, moderation, and operational workflows.
10. Launch MVP and iterate using measured product data.

**Rule:** a database/security gate is not considered complete until the real CI suite passes.

---

# 5. MVP Scope

## Phase 0 — Architecture & Security Foundation

**Status: In progress / database foundation substantially complete**

### Deliverables
- Product requirements and domain boundaries
- PostgreSQL schema
- Foreign keys, constraints, indexes, enums
- RLS policies
- Authorization helpers
- Private storage policies
- Server-controlled financial operations
- Moderation architecture
- Account deletion architecture
- Database pgTAP security suites
- GitHub Actions database CI

### Security gates
- Schema contract
- RLS/security contract
- Behavioral social/content security
- Messaging security
- Financial security
- Deletion/retention security
- Final cross-domain security audit

---

## Phase 1 — Public Landing & Authentication

Build the public-facing product entry point and complete authentication flow.

### Features
- Landing page
- Product mission/value proposition
- Global/cultural discovery explanation
- Sign up
- Sign in
- Email/phone verification
- Password recovery through Supabase Auth
- Terms of Use acceptance
- Privacy Policy acceptance
- Session handling
- Logout
- Authentication guards
- Account status handling

### Registration rules
- First name required
- Middle name optional
- Last name required
- Date of birth required
- Gender required with `MALE`, `FEMALE`, `UNDISCLOSED`
- Country/region required using ISO country codes
- Email and/or phone required
- At least one contact method must be verified before activation
- Username optional at registration and generated when omitted
- Display name defaults from the user's name

### Minor safety
- Under 13 prohibited
- Ages 13–17 require additional safeguards before production launch
- Exact guardian/legal workflow requires dedicated legal/product research

---

## Phase 2 — Profiles & Identity

### Features
- Profile page
- Username
- Display name
- Profile photo
- Bio
- Country/region visibility
- Languages
- Interests
- Profile editing
- Privacy settings
- Discoverability settings
- UI language/preferences

### Identity separation
Legal/account identity must remain separate from the public profile identity.

Private fields include:
- legal/account names
- date of birth
- gender
- email/phone
- authentication/security data
- legal acceptance records

Public profile fields are explicitly controlled by profile/privacy rules.

---

## Phase 3 — Social Graph

### Features
- Follow
- Unfollow
- Followers
- Following
- Block
- Unblock
- Report

### Rules
- Follow is directed.
- Self-follow is prohibited.
- Duplicate follows are prohibited.
- No follow-request system in MVP.
- Blocking is a universal social barrier.
- Creating a block removes conflicting follow relationships in both directions.
- Unblocking does not restore previous relationships.
- Reports are allegations/signals, not automatic proof of wrongdoing.

---

## Phase 4 — Posts & Media

### Features
- Create text posts
- Upload/add photos
- Text + image posts
- Edit/delete own posts
- Public/followers/private visibility
- Likes
- Comments
- One-level comment replies
- Comment likes
- Share/copy link
- Internal post sharing through messaging
- Mentions
- Post tags

### Media rules
- Images only in MVP
- Maximum 10 images per post
- Private Storage
- Validate actual file signatures
- Resize/compress server-side
- Strip EXIF/GPS metadata
- Use signed URLs only when required
- Never expose service-role credentials

---

## Phase 5 — Feed

The feed is a logical read domain rather than a permanent feed table.

### MVP surfaces
- Home
- Following
- Explore

### Requirements
- Authentication required
- Respect account status
- Respect blocks
- Respect post visibility
- Respect moderation restrictions
- Cursor pagination
- No privacy bypass through feed queries

Ranking can initially remain simple and deterministic. More advanced ranking is deferred until real usage data exists.

---

## Phase 6 — Global Discovery

This is a major product differentiator.

### Features
- Discover people globally
- Discover by country
- Discover by language
- Discover by interests
- Explore cultures and perspectives
- Optional discovery preferences
- Follow/message/report/block actions from discovery

### Candidate requirements
- Active account
- Discoverable profile
- Not self
- No block in either direction
- Respect profile privacy
- Respect country visibility
- Respect moderation restrictions
- Avoid already-followed users where appropriate

### Ranking principles
May use:
- shared interests
- shared languages
- selected country preferences
- profile completeness
- activity
- diversity/exploration objectives
- repetition penalties

Must not infer or rank people using sensitive characteristics such as race, ethnicity, religion, politics, sexuality, health, disability, criminal history, or financial status.

---

## Phase 7 — Messaging

### MVP
- 1:1 direct conversations
- Text messages
- Image messages
- Post sharing
- One-level message replies
- Read state via conversation participant state
- Realtime delivery
- Block-aware authorization
- Message permissions

### Message permissions
- EVERYONE
- FOLLOWERS
- NO_ONE

For `FOLLOWERS`, the sender must follow the recipient.

### Security
- PostgreSQL remains source of truth.
- Realtime is delivery infrastructure, not authorization.
- Conversation participants control access.
- Block overrides messaging permission.
- Moderation access to private messages is permission-controlled and audited.

Future:
- Group conversations
- Voice messages
- Audio/video calls
- File messages

---

## Phase 8 — Notifications

### MVP
- Follows
- Likes
- Comments
- Replies
- Shares
- Messages
- Mentions
- Tags
- System notifications
- Moderation notifications

Notifications are derived projections. The originating domain remains authoritative.

Delivery preferences:
- In-app
- Push
- Email

No client may arbitrarily create system notifications.

---

## Phase 9 — Safety, Moderation & Appeals

### Features
- User reports
- Content reports
- Moderation cases
- Evidence
- Moderator notes
- Moderation actions
- Appeals
- Moderation audit logs
- User restrictions/suspensions/deactivation

### Principles
- Reports do not automatically ban users.
- Automated detection creates signals/cases rather than unquestionable punishment.
- Human oversight is required where appropriate.
- Private message moderation is tightly permissioned and audited.
- Cultural/language context should be considered.
- Keyword-only moderation is insufficient.
- Original user content remains authoritative when translation is involved.

---

# 6. Monetization & Financial System

These systems are future-facing and must remain isolated from the social core.

## HBC Closed-Loop Currency

HBC is a consumer virtual currency.

**Locked economic rule:**
> Spending HBC creates a transaction; it does not transfer HBC ownership to another user.

A gift sent with HBC creates a separate creator economic entitlement. HBC itself is not transferred to the recipient as spendable balance.

### Financial architecture
- Currency
- Payment providers
- Payment methods
- Monetization products
- Product prices
- Purchases
- Payments
- Payment attempts
- Coin wallets
- Coin transactions
- Coin transaction entries
- Financial accounts
- Financial ledger entries
- Virtual gifts
- Gift transactions
- Refunds
- Payment reconciliation

### Financial principles
- Integer minor units for fiat
- Integer units for HBC
- No negative wallets
- Atomic wallet operations
- Idempotent payment/webhook processing
- Server-authoritative prices
- Server-authoritative exchange rates
- Payment verification on the server
- Double-entry financial ledger
- Posted ledger entries are immutable
- Corrections happen through reversals
- Financial analytics never replace financial truth

### Future creator economy
- Creator earnings
- Payouts
- Subscriptions
- Tax handling
- Chargebacks
- Financial holds
- KYC/fraud controls

These remain blocked until economics, legal, tax, KYC, and fraud requirements are defined.

---

# 7. Analytics & Telemetry

### Analytics
- Event definitions
- Analytics events
- Daily metrics
- Daily dimension metrics

### Telemetry
- Technical events
- Severity
- Service/environment
- Trace/request identifiers
- Operational metadata

### Rules
- Analytics is a derived domain.
- Raw identifiable analytics have finite retention.
- Aggregates may remain when sufficiently anonymized.
- No sensitive-attribute inference.
- No private message content in analytics.
- Small-group protection is required for dimensional reporting.
- Analytics failures must not roll back core product transactions.

### Mission/product metrics
Potential metrics include:
- cross-country connections
- meaningful conversations
- discovery-to-follow conversion
- language-based connections
- diversity of countries encountered
- retention across regions

Do not create a user-level `diversity_score` or similar sensitive profiling mechanism.

---

# 8. Account Deletion & Data Retention

### Locked policy
- 30-day deletion grace period
- Reauthentication required
- Confirmation required
- Account access restricted/deactivated during grace period
- Cancellation requires reauthentication
- Destructive worker executes after grace period
- Storage cleanup is asynchronous
- Supabase Auth cleanup follows the deletion workflow
- Ordinary profile/social data is deleted/anonymized
- Messages may be retained/anonymized for the other participant where required
- Financial ledger records are retained as required
- Wallet is frozen/closed; no automatic fiat redemption
- Moderation/safety/legal records may survive where necessary
- Analytics identifiers are deleted/anonymized
- Anonymous aggregates may remain
- Legal/safety holds override ordinary deletion where necessary
- Workers must be idempotent

---

# 9. Administration & Operations

### Admin roles
- SUPER_ADMIN
- PLATFORM_ADMIN
- MODERATOR
- SAFETY_REVIEWER
- SUPPORT_AGENT
- ANALYST

### Permission model
Explicit permissions are assigned to roles. There is no automatic role inheritance.

Examples:
- users.view
- users.restrict
- users.suspend
- users.deactivate
- posts.view
- posts.remove
- reports.view
- reports.manage
- moderation.cases.view
- moderation.actions.execute
- moderation.appeals.review
- messages.view_moderation
- payments.view
- payments.refund
- payments.reconcile
- coins.view
- coins.adjust
- payouts.manage

### Requirements
- Sensitive admin actions audited
- No client role escalation
- Sensitive changes require appropriate authorization/reauthentication
- Secrets never stored in platform configuration
- Feature flags never act as authorization controls
- Admin audit logs are append-only

---

# 10. Storage Architecture

Private Supabase Storage buckets:

- `avatars`
- `posts`
- `messages`

Canonical paths:

```text
avatars/{user_id}/profile.webp
posts/{user_id}/{post_id}/{media_id}.webp
messages/{user_id}/{conversation_id}/{message_id}.webp
```

MVP supports images only.

Future media types get separate handling rather than expanding the MVP media model indiscriminately.

---

# 11. Authorization Architecture

All protected operations conceptually pass through a common authorization layer:

```text
AUTHORIZATION ENGINE
├── account status
├── block relationship
├── privacy
├── visibility
├── follow relationship
├── message permission
├── moderation restrictions
├── ownership
└── role/permission
```

Representative decisions:

```text
canViewPost()
canViewProfile()
canMessageUser()
canDiscoverUser()
canMentionUser()
canSendGift()
canAccessMedia()
```

Effective access is derived from:

```text
ACCOUNT STATUS + ACTIVE MODERATION ACTIONS
```

Do not duplicate restriction state across domain tables.

---

# 12. Testing & CI Roadmap

## Database security suites

| Suite | Purpose | Status |
|---|---|---|
| `00_schema_contract.sql` | Schema structure and critical columns | Green |
| `01_security_contract.sql` | RLS and security-definer contract | Green |
| `02_behavioral_security.sql` | Social/content authorization | Green |
| `03_messaging_security.sql` | Messaging authorization and isolation | Green |
| `04_financial_security.sql` | Wallet/payment/gift/ledger security | Green |
| `05_deletion_retention_security.sql` | Deletion lifecycle and retention barriers | In progress |
| Final cross-domain audit | Combined security review | Pending |

### CI requirements
Every database change must pass:

1. Supabase startup
2. Migration reset
3. All pgTAP database suites
4. Clean shutdown

No feature is considered database-complete while the CI gate is failing.

---

# 13. Post-Database Application Roadmap

Once the database/security gate is fully green:

### A. Application foundation
- Initialize Next.js application
- Configure TypeScript
- Configure Tailwind
- Configure Supabase client/server utilities
- Environment configuration
- Authentication middleware
- Route protection
- Error/loading boundaries
- Shared UI primitives

### B. Authentication UI
- Landing page
- Sign-up
- Sign-in
- Verification
- Password recovery
- Logout
- Account status handling

### C. Profile UI
- Profile page
- Edit profile
- Avatar upload
- Languages/interests
- Privacy settings
- Discoverability settings

### D. Social UI
- Follow/unfollow
- Followers/following
- Block/unblock
- Report flows

### E. Content UI
- Post composer
- Upload Photo/Add Photo
- Image previews
- Feed cards
- Likes
- Comments/replies
- Sharing
- Mentions/tags

### F. Discovery UI
- Discover people
- Country filters
- Language filters
- Interest filters
- Global exploration

### G. Messaging UI
- Inbox/conversation list
- 1:1 chat
- Realtime messages
- Image messages
- Post sharing
- Read state
- Message permissions

### H. Notifications UI
- Notification center
- Read/unread state
- Notification preferences

### I. Safety UI
- Block/report dialogs
- Moderation status messaging
- Appeal flow where applicable
- Privacy controls

---

# 14. Post-MVP Roadmap

After the MVP is stable and usage data supports expansion:

- Mobile app with React Native + Expo
- Group messaging
- Voice messages
- Voice/video calls
- Live streaming
- Creator monetization
- HBC purchases
- Virtual gifts
- Creator earnings
- Payouts
- Subscriptions
- Premium features
- Advanced notifications
- More sophisticated feed ranking
- Recommendation systems with privacy safeguards
- Translation assistance
- Cultural discovery experiences
- Additional media types
- Scalable media infrastructure
- Marketplace/commerce features if validated

Features are not promoted from roadmap to implementation until product, safety, legal, economic, and technical requirements are sufficiently defined.

---

# 15. Explicitly Out of MVP

The following are intentionally excluded from the initial launch:

- Live streaming
- Voice/video calls
- Voice messages
- Gifts
- Payouts
- Subscriptions
- Ads
- Complex AI recommendation systems
- Marketplace
- Cryptocurrency
- Group messaging
- Creator economy settlement

This prevents the first release from becoming unnecessarily complex or financially risky.

---

# 16. Definition of Done

A feature is considered complete only when:

- Schema/contract is defined where applicable.
- Authorization rules are defined.
- Privacy implications are addressed.
- RLS/security boundaries are implemented where applicable.
- Server authority is enforced for sensitive operations.
- Automated tests cover security-critical behavior.
- CI passes.
- UI/API integration is complete.
- Error states are handled.
- Deletion/retention implications are addressed.
- Audit requirements are addressed where applicable.
- Documentation is updated.

---

# 17. Current Project Status

### Completed / Green
- Core PostgreSQL schema foundation
- RLS security foundation
- Authorization helper foundation
- Social graph security
- Content security
- Messaging security
- Discovery schema/security foundation
- Notifications architecture
- Moderation architecture
- Admin architecture
- Analytics/telemetry architecture
- Financial architecture
- Financial security tests
- GitHub Actions database CI

### In progress
- Account deletion/retention security suite

### Next gates
1. Get deletion/retention suite green.
2. Run final cross-domain security audit.
3. Lock the database/security foundation.
4. Begin Next.js application foundation.
5. Implement authentication and landing experience.
6. Implement profiles and social graph.
7. Implement posts/media/feed.
8. Implement global discovery.
9. Implement messaging and notifications.
10. Complete MVP safety/moderation UX.
11. Run integration/end-to-end testing.
12. Prepare production deployment.

---

# 18. Project Rule

**Do not move to application coding simply because the schema exists. Move when the database/security contract is proven by automated tests and the remaining risks are explicitly understood.**

Hi!Book should be built as a trustworthy global connection platform first, and optimized for scale and monetization second.
