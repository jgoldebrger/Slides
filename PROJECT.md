# UpdateDeck

AI-powered slide deck SaaS for project status updates.

## What it does

1. Teams capture structured project updates (goals, progress, metrics, risks)
2. AI generates a deck outline and slide content
3. Users edit, reorder, and brand slides
4. Export to PPTX with org brand kit applied

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js App Router, React 19, Tailwind 4, shadcn/ui |
| Backend | Next.js API routes, Server Actions, Inngest |
| Database | Supabase Postgres + RLS |
| Auth | Supabase Auth (SSR cookies) |
| Storage | Supabase Storage |
| AI | Vercel AI SDK + OpenAI |
| Export | pptxgenjs |
| Billing | Stripe |
| Email | Resend |
| Observability | Sentry, PostHog |

## Folder structure

```
src/
  app/           # Routes (auth, dashboard, API)
  components/    # UI (ui/, slides/, decks/)
  lib/           # Business logic (ai/, export/, supabase/)
  types/         # Shared TypeScript types
  middleware.ts  # Session refresh
supabase/
  migrations/    # SQL migrations with RLS
.cursor/
  rules/         # Cursor agent rules
  skills/        # Cursor agent skills
```

## Conventions

- `@/` import alias maps to `src/`
- Zod for all external input validation
- Server Components for data fetching; `'use client'` only when needed
- Every tenant table has `org_id` with RLS
- Slide contract: `src/types/slide.ts`

## Getting started

```bash
cp .env.example .env.local   # fill in values
npm install
npm run dev
```

Apply migrations via Supabase CLI or dashboard.

## Docs

See [DOCS.md](./DOCS.md) for the full documentation map.
