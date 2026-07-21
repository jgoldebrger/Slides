# UpdateDeck Agents

Guidance for AI coding agents working on this repository.

## Project

**UpdateDeck** — AI-powered slide deck SaaS that turns structured project updates into branded presentations (PPTX).

## Stack

Next.js 15+ App Router · React 19 · TypeScript · Supabase · Tailwind 4 · shadcn/ui · Vercel AI SDK · Inngest · Stripe · Resend · Sentry · PostHog

## Documentation index

| Doc | Purpose |
|-----|---------|
| [PROJECT.md](./PROJECT.md) | Overview, conventions, folder structure |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, data flow |
| [FRONTEND.md](./FRONTEND.md) | App Router, components |
| [BACKEND.md](./BACKEND.md) | API routes, server logic |
| [MIDDLEWARE.md](./MIDDLEWARE.md) | Auth session handling |
| [DATABASE.md](./DATABASE.md) | Schema, RLS, migrations |
| [SECURITY.md](./SECURITY.md) | Security policies |
| [UX.md](./UX.md) | User flows, accessibility |
| [DESIGN.md](./DESIGN.md) | Visual system |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Third-party services |
| [TESTING.md](./TESTING.md) | Test strategy |
| [PERFORMANCE.md](./PERFORMANCE.md) | Optimization |
| [DOCS.md](./DOCS.md) | How to maintain docs |

## Cursor config

- **Rules:** `.cursor/rules/` — scoped `.mdc` files; `project.mdc` always applies
- **Skills:** `.cursor/skills/` — task-specific workflows (slide builder, security review, etc.)

## Agent rules

1. Read PROJECT.md and the relevant domain doc before coding
2. Server Components by default; minimize client state
3. All data access org-scoped via Supabase RLS — never bypass with service role in user paths
4. Slide types defined in `src/types/slide.ts` — validate with Zod
5. Long-running work (AI, export) via Inngest, not inline HTTP
6. No secrets in code; use `.env.example` keys
7. Keep changes focused; match existing patterns

## Next.js note

<!-- BEGIN:nextjs-agent-rules -->
This is NOT the Next.js you know. APIs and conventions may differ from your training data. Read `node_modules/next/dist/docs/` before writing unfamiliar Next.js code.
<!-- END:nextjs-agent-rules -->
