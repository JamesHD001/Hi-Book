# Hi!Book Web

Next.js + TypeScript web application for Hi!Book 2.0.

## Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Supabase Auth / PostgreSQL / Storage / Realtime

## Local development

1. Copy `.env.example` to `.env.local`.
2. Set the Supabase project URL and publishable key.
3. Install dependencies with `npm install`.
4. Start the development server with `npm run dev`.

The browser and server Supabase clients are intentionally separated. Authorization remains server/database authoritative; the client must not bypass RLS or reproduce business rules locally.

## Data-access rules

The web layer follows a small set of performance and security rules:

- Use server-side RPCs for security-sensitive or multi-row transactional workflows.
- Batch related reads instead of issuing one query per rendered item.
- Batch signed Storage URLs with `createSignedUrls` when a page renders multiple avatars/media objects.
- Use database RPCs for derived read domains such as feeds, discovery, notifications, and the messaging inbox.
- Keep latest-per-conversation message selection inside PostgreSQL rather than fetching an arbitrary global message window and reducing it in application code.
- Keep cursor pagination for potentially large feeds and derived lists.
- Never expose service-role credentials to browser code.

## Verification

The repository has separate GitHub Actions gates for the PostgreSQL security suite and the web application. The web gate runs dependency installation, ESLint, and a production Next.js build with CI-safe Supabase placeholders.
