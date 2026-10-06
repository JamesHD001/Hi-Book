# Hi!Book UI/UX Architecture & Wireframe Blueprint

**Status:** Draft for product review  
**Phase:** Architecture and low-fidelity wireframes  
**Implementation gate:** Do not begin new screen redesign or visual-polish work until the information architecture, shell, key flows, and responsive wireframes are reviewed and approved.

This document is the planning source of truth for the UI/UX reset. It uses the product principles and MVP scope in `docs/hi-book-plan.md`, the current visual tokens in `docs/design-system.md`, and the existing Next.js route inventory. It does not replace the existing application or authorize a visual redesign by itself.

## 1. Product Structure

### Public

```text
Hi!Book
├── Landing                         /
├── About                           proposed; no current route
├── Legal and safety information
│   ├── Terms of Use                /terms
│   ├── Privacy Policy              /privacy
│   ├── Community Guidelines        /community-guidelines
│   └── Data Protection             /data-protection
└── Authentication
    ├── Sign up                     /signup
    ├── Sign in                     /login
    ├── Forgot password             /forgot-password
    └── Reset password              /reset-password
```

### Authenticated

```text
Hi!Book
├── Community                       /community
│   ├── Home feed
│   ├── Following feed              future or feed mode; confirm scope
│   ├── Create post
│   └── Post detail/interactions    current route behavior to inventory
├── Discover                        /discover
│   ├── People
│   ├── Country/language/interest discovery
│   └── Posts                       confirm scope
├── Network                         /network
│   ├── Followers                   /network/followers
│   └── Following                   /network/following
├── Messages                        /messages
│   └── Conversation                /messages/[conversationId]
├── Notifications                   /notifications
├── Profiles
│   ├── My profile                  /profile
│   ├── Public profile              /u/[username]
│   └── Edit profile                profile workflow, not a separate current route
├── Settings                        /settings
│   ├── Privacy and discovery
│   ├── Messaging preferences
│   ├── Language/preferences
│   ├── Account and security
│   └── Account deletion            /account-deletion
├── Safety
│   ├── Appeals                     /appeals
│   └── Reports/blocks              entry points and management scope to confirm
└── Moderation                      role-gated
    ├── Queue                       /moderation
    ├── Case                        /moderation/[caseId]
    └── Appeals                     /moderation/appeals[...]
```

### Future, not part of MVP wireframe approval

- Communities/groups and group feeds
- Group conversations
- Live audio/video and streaming
- Creator economy, subscriptions, gifts, and payouts
- Additional media types

Keep future areas visible in the architecture without placing speculative destinations in the MVP shell.

## 2. Product and UX Principles

- Connection and cultural curiosity are the primary product purpose; the interface is not a generic admin dashboard.
- Privacy and user control are visible in context, not hidden behind unexplained defaults.
- Each destination has one canonical navigation entry per viewport. Profile, account menu, settings, and logout must not be duplicated across the header and navigation.
- The same information architecture applies on desktop, tablet, and mobile; only the navigation and layout adapt.
- Server state is authoritative. A success state is shown only after persistence succeeds; read failures must not be presented as empty profile data.
- Loading, empty, error, offline, and success states are designed alongside the primary state.
- Private profile and media data are never implied to be public by their presentation.
- Accessibility, keyboard operation, reduced motion, and readable content density are wireframe constraints, not polish tasks.

## 3. Canonical Application Shell

### Desktop wireframe (proposal)

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ Hi!Book │ Community │ Discover │ Network │ Messages │ Notifications (badge) │ ◉ │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Page title / context                                      Page actions         │
│  ┌──────────────────────────────────────────────┐  ┌────────────────────────┐ │
│  │                                              │  │ Optional contextual    │ │
│  │              Primary page content            │  │ rail: related people,  │ │
│  │                                              │  │ discovery, or help     │ │
│  └──────────────────────────────────────────────┘  └────────────────────────┘ │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Proposed ownership:** the avatar/account menu contains My Profile, Settings, account/security destinations, and Sign out. Notifications has one direct primary destination. The exact menu grouping is a product decision; duplicate standalone Profile and Settings icons are not the default.

### Mobile wireframe (proposal)

```text
┌──────────────────────────────────┐
│ Hi!Book                       ◉  │  Brand and account menu
├──────────────────────────────────┤
│                                  │
│       Scrollable page content    │
│       One primary column         │
│                                  │
├──────────────────────────────────┤
│ Home  Discover  Network  Inbox  Alerts │  Fixed bottom navigation
└──────────────────────────────────┘
```

Account destinations, including My Profile and Settings, are reached through the account menu. The mobile destination count, icon/label treatment, and placement of Notifications require review before visual design.

### Responsive behavior

| Range | Navigation | Content behavior |
| --- | --- | --- |
| Wide desktop | Full primary navigation and account menu | Primary column with optional contextual rail |
| Tablet | Compact navigation or an explicit overflow menu | Single primary column; contextual content moves below or becomes a deliberate secondary view |
| Mobile | Compact top bar, account menu, bottom primary navigation | Single column, full-width actions, safe-area-aware fixed navigation |

Exact breakpoints and rail widths are to be selected during responsive wireframe review and then encoded as shared tokens. Pages must not define independent breakpoint behavior.

### Shell states to wireframe

- Signed-out public shell
- Signed-in shell with normal and unread notification states
- Account menu closed/open, keyboard navigation, and dismissal
- Current destination and nested-route active states
- Loading/session-refresh and signed-out/expired-session states
- Restricted/deactivated account state
- Narrow tablet and mobile layouts, including safe-area insets
- Moderation navigation visible only when the user has the required permission

## 4. Core Experience Wireframes

These are structure-only sketches. Copy, colors, imagery, and final component styling belong to later phases.

### Community

```text
┌──────────────────────────────────────────────┐
│ Community                         Feed mode  │
├──────────────────────────────────────────────┤
│ [Your avatar]  Share something with people…  │
│               [Photo] [Post]                  │
├──────────────────────────────────────────────┤
│ Feed controls / selected feed mode            │
├──────────────────────────────────────────────┤
│ [Avatar] Name · @handle · time · visibility   │
│ Post text                                     │
│ [Media, when present]                         │
│ Like   Comment   Share                        │
├──────────────────────────────────────────────┤
│ Next post…                                    │
└──────────────────────────────────────────────┘
```

Decide whether Home, Following, and Explore are tabs, filter controls, or separate destinations. Preserve clear loading, empty-feed, failed-load, and post-submit states.

### Discover

```text
┌──────────────────────────────────────────────┐
│ Discover                                      │
│ [People] [Posts?]                             │
│ [Search people or topics…]                    │
│ [Country] [Language] [Interests] [Clear]      │
├──────────────────────────────────────────────┤
│ Result: [avatar] Name / @handle               │
│         Shared context (non-sensitive)        │
│         [Follow] [Message] [More]             │
└──────────────────────────────────────────────┘
```

Filters must reflect user-selected discovery preferences and visibility rules. Do not infer or display sensitive attributes.

### Network

```text
┌──────────────────────────────────────────────┐
│ Network                                       │
│ [Followers] [Following]                      │
│ [Search this list…]                           │
├──────────────────────────────────────────────┤
│ [avatar] Name / @handle      [Follow state]   │
│          Optional public profile context     │
└──────────────────────────────────────────────┘
```

Blocking and reporting should be reachable from a predictable More menu with confirmation and completion/error states.

### Messages

```text
Inbox                               Conversation
┌─────────────────────────┐         ┌───────────────────────────────┐
│ Messages                │         │ Person / safety actions       │
│ [Search…]               │         ├───────────────────────────────┤
│ Person · preview · time │         │ Message history               │
│ Person · preview · time │         │                               │
│ …                       │         ├───────────────────────────────┤
└─────────────────────────┘         │ [Message…] [Attach] [Send]    │
                                    └───────────────────────────────┘
```

On mobile, inbox and conversation are separate navigation states. A conversation needs a clear back-to-inbox action, participant identity, block/report access, delivery/read states, and failure/retry affordances.

### Notifications

```text
┌──────────────────────────────────────────────┐
│ Notifications                  [Mark all read]│
│ [All] [Unread]                                │
├──────────────────────────────────────────────┤
│ [actor avatar] Human-readable event · time    │
│ [actor avatar] Human-readable event · time    │
└──────────────────────────────────────────────┘
```

Define grouping, unread treatment, mark-read behavior, and destination behavior before styling. System and moderation events must be distinguishable without exposing private case information.

### Profile: public and self views

```text
┌──────────────────────────────────────────────┐
│ [Cover or no cover: decision]                 │
│ [Avatar]  Display name                        │
│           @username                           │
│           Bio                                 │
│           Country/languages only if visible  │
│           [Edit profile] or [Follow] [More]   │
│           Posts / Followers / Following        │
├──────────────────────────────────────────────┤
│ Profile content / posts                       │
└──────────────────────────────────────────────┘
```

Self view and public view share an identity hierarchy but have distinct actions. Private fields, hidden country, restricted accounts, empty profiles, and blocked relationships need defined states.

### Edit profile

```text
┌──────────────────────────────────────────────┐
│ Edit profile                         [Close]  │
├──────────────────────────────────────────────┤
│ [Photo preview] [Choose photo] [Remove?]      │
│              Crop/position controls? decision │
│ Display name                                  │
│ Bio                                           │
│ Country                                       │
│ Languages                                     │
│ Interests                                     │
│ Privacy and discovery                         │
├──────────────────────────────────────────────┤
│ [Cancel]                          [Save]       │
└──────────────────────────────────────────────┘
```

**Required edit-profile flow:**

```text
Open editor → change fields/photo → preview draft → Save
    → validate → upload selected image if changed → persist profile/preferences
    → reload canonical server state → success
    ↘ failure: keep the draft, show a useful error, allow retry
Cancel → discard staged changes → return without mutation
```

The current implementation previews a selected photo locally, then resizes/uploads it when Save is submitted. The intended crop/position editor, remove-photo behavior, and whether photo upload belongs in the overall Save transaction remain product decisions. Regardless of the decision, a successful save must survive a full reload, and selecting a file must not imply that the server has saved it.

### Settings

```text
┌──────────────────────────────────────────────┐
│ Settings                                      │
│ [Account] [Privacy] [Discovery] [Messages]…   │
├──────────────────────────────────────────────┤
│ Section title                                 │
│ Setting name        Explanation   [control]   │
│ Setting name        Explanation   [control]   │
│                                             │
│ [Save if staged] or immediate-save feedback  │
└──────────────────────────────────────────────┘
```

Decide whether settings save immediately or as a staged form. Destructive account actions remain separated, explicit, and confirmation-gated.

### Public landing and authentication

Landing introduces the mission and routes clearly into sign up/sign in. Authentication screens prioritize the form, provider actions, validation, legal consent, and recoverable error states. Onboarding is a distinct post-authentication completion flow, not a second signup form.

## 5. Interaction Contracts

| Flow | Entry | Success | Failure/cancel |
| --- | --- | --- | --- |
| Create post | Community composer | Post appears in feed after server confirmation | Keep draft and explain upload/validation failure |
| Follow | Profile or discovery result | Follow state and counts refresh from server | Keep prior state and offer retry |
| Send message | Inbox/profile | Message appears with delivery state | Preserve composed text and allow retry |
| Notification | Notification row | Navigate to the related destination and update read state | Keep notification readable and report navigation error |
| Edit profile | Self profile/account menu | Persisted values reload identically | Preserve draft, show actionable error; Cancel discards only staged changes |
| Upload profile photo | Edit profile photo control | Preview then persist path and show stable signed image after reload | Do not show success; retain/reselect file and allow retry |
| Delete account | Settings/account deletion | Show scheduled state and grace-period details | Keep account active and explain failure |

Every flow must specify keyboard behavior, pending state, disabled controls, duplicate-submit prevention, and screen-reader status messaging.

## 6. Decisions Required Before High-Fidelity Design

1. Confirm primary desktop destinations and whether Profile is a primary link or only in the account menu.
2. Confirm mobile bottom-navigation destinations, labels, order, and maximum count.
3. Confirm whether tablet follows desktop navigation or a compact/overflow pattern.
4. Confirm whether the desktop contextual rail is global, page-specific, or limited to Community/Discover.
5. Confirm profile photo crop/position controls, remove-photo behavior, and upload timing.
6. Confirm Community feed modes and whether Discover contains people, posts, or both in MVP.
7. Confirm Settings information architecture and save semantics.
8. Confirm notification grouping/filtering and badge rules.
9. Confirm public About page scope; it is named in the proposed IA but has no current route.
10. Confirm how report/block management is exposed beyond contextual actions.

## 7. Phase Gates

1. **Information architecture:** approve public, authenticated, safety, and role-gated destinations.
2. **User flows:** approve primary journeys and all failure/cancel states.
3. **Low-fidelity wireframes:** approve desktop shell and major MVP screens.
4. **Responsive wireframes:** approve tablet/mobile variants and navigation behavior.
5. **Design-system audit:** reconcile current tokens and components with approved wireframes; add missing primitives.
6. **High-fidelity mockups:** apply the existing Connected Social direction after structure is stable.
7. **Implementation:** resume one approved slice at a time, beginning with the application shell.
8. **QA:** validate responsive behavior, accessibility, interaction states, and visual consistency.

**Exit criterion:** no page-level UI redesign proceeds while a decision that changes its information hierarchy, navigation, or primary interaction remains unresolved.
