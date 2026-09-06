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
