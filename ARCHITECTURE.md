# Architecture

## Overview

UpdateDeck is a multi-tenant SaaS. Each user belongs to one or more organizations. All data is scoped by `org_id` and protected by Supabase Row Level Security.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Browser    │────▶│  Next.js App │────▶│  Supabase   │
│  (React)    │◀────│  (RSC + API) │◀────│  (PG + RLS) │
└─────────────┘     └──────┬───────┘     └─────────────┘
                           │
                    ┌──────┴───────┐
                    │   Inngest    │
                    │ (AI, export) │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
          OpenAI       Storage      Resend
```

## Domain model

```
Organization
  ├── Projects
  │     └── ProjectUpdate (structured JSON fields)
  ├── Decks (type, status, outline)
  │     └── Slides (layout, content JSONB)
  ├── BrandKit (colors, logo, font)
  └── Exports (PPTX files)
```

### Deck lifecycle

`draft` → `outline` → `approved` → `generating` → `ready` | `failed`

### Export lifecycle

`pending` → `processing` → `completed` | `failed`

## Request paths

| Path | Handler | Notes |
|------|---------|-------|
| Page render | Server Component + Supabase server client | RLS filters data |
| Form submit | Server Action | Zod validate → write → revalidate |
| Webhook | API route | Verify signature → enqueue Inngest |
| AI / export | Inngest function | Service role for writes |

## Key decisions

- **RLS over app-level checks** — defense in depth, but still verify org in API layer
- **JSONB for slide content** — flexible layouts without schema migrations per layout
- **Async jobs** — Deck-scale AI (outline, fill, refresh), per-slide rewrite/visuals/backgrounds, and PPTX export run via Inngest; HTTP/actions only enqueue and poll `ai_generations`
- **Export formats** — `lib/export/format-registry.ts` dispatches by `exports.format` (currently `pptx`; add adapters for new formats without forking slide IR)
- **Layout contract** — `lib/slides/layout-contract.ts` + Zod fill schemas are shared; React preview and PPTX mappers are parallel renderers (keep in sync via contract tests)
- **Slide fill** — sequential OpenAI calls inside the generate job (avoids unbounded fan-out); prefer finer Inngest steps if decks grow large

## Module boundaries

| Module | Responsibility |
|--------|---------------|
| `lib/supabase/` | Client factories (server, browser, middleware) |
| `lib/ai/` | Prompts, outline generation, content fill |
| `lib/export/` | PPTX generation, layout mapping |
| `lib/inngest/` | Event definitions, job handlers |
| `lib/stripe/` | Billing, webhooks |
| `components/slides/` | Slide preview renderers |
| `lib/slides/layout-contract.ts` | Shared layout IR (slots + fill hints) for AI, preview, export |
