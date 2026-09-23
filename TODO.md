# Hi!Book TODO

## Visual Identity V1.0
- [x] Clarify “Book” as a social book of people, connections, information, experiences, and memories
- [x] Establish Hi!Book as a global social platform
- [x] Establish “Connected Social” as the visual direction
- [x] Define brand personality and visual guardrails
- [x] Define preliminary teal/yellow brand palette
- [x] Define semantic colors
- [x] Define typography candidates
- [x] Define shape, iconography, imagery, motion, and accessibility principles
- [x] Define preliminary semantic design tokens
- [x] Implement production color tokens in the web foundation
- [x] Implement a reusable Hi!Book connection/speech-bubble mark
- [ ] Verify official logo colors against the final logo asset
- [ ] Finalize primary typeface after component testing
- [ ] Define logo clear-space rules
- [ ] Define logo minimum sizes
- [ ] Finalize compact logo and app-icon variants
- [ ] Define complete logo usage rules

## Design System — Phase 1
- [x] Establish global color foundations
- [x] Establish typography scale
- [x] Establish spacing tokens
- [x] Establish radius tokens
- [x] Establish elevation tokens
- [x] Establish focus/reduced-motion rules
- [x] Build Button primitives
- [x] Build Input/Form primitives
- [x] Build Card/Surface primitives
- [ ] Build Avatar primitives
- [x] Build navigation primitives
- [ ] Build Feed/Post primitives
- [ ] Build Messaging primitives
- [ ] Build Profile primitives
- [ ] Build Notification primitives
- [ ] Apply design system across authenticated screens (remaining screens)
- [ ] Final responsive QA across desktop/mobile
- [ ] Final light/dark QA
- [ ] Accessibility QA

## Authentication — Sign In & Registration
- [x] Apply Hi!Book visual identity to sign-in
- [x] Apply Hi!Book visual identity to registration
- [x] Connect sign-in to Supabase password authentication
- [x] Connect registration to Supabase account creation
- [x] Validate registration age, country code, password, and policy acceptance
- [x] Support email confirmation callback
- [x] Add password recovery request flow
- [x] Add password reset flow
- [x] Show sign-in states for confirmation errors and successful password reset
- [ ] Verify Supabase email-confirmation templates and redirect URLs (requires hosted Auth configuration/email test)
- [x] Verify registration completion RPC and onboarding handoff
- [ ] Test duplicate-email and invalid-credential messaging (requires a live auth test account)
- [ ] End-to-end test sign-in, registration, confirmation, and recovery (requires live email delivery)
- [ ] Review authentication accessibility on desktop and mobile


## Project-Wide Visual Hierarchy Review — 2026-09-23
- [x] Audit existing global tokens and stylesheet architecture before visual changes.
- [x] Restore Tailwind v4 utility generation through the existing stylesheet architecture.
- [x] Normalize common slate/blue utility colors to the established Hi!Book brand palette.
- [x] Add responsive landing-page visual hierarchy styles while preserving the established editorial direction.
- [x] Keep the public landing navigation sticky and visually consistent with the authenticated header.
- [x] Refactor shared authenticated navigation to use external Hi!Book navigation primitives.
- [x] Refactor sign-in and registration forms to use semantic/shared form primitives.
- [x] Refactor community page hierarchy, shortcuts, feed controls, and post surfaces.
- [x] Refactor discovery page to use shared page-header, stat, and feedback primitives.
- [ ] Complete remaining authenticated-screen primitive migration.
- [ ] Complete page-by-page responsive/mobile visual QA after implementation.
- [ ] Complete final accessibility and interaction-state QA after the migration.
