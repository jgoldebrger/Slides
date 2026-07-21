# Backend

## Product surface: Server Actions first

The UpdateDeck UI uses **Next.js Server Actions** in `src/lib/actions/` for
CRUD, editing, share links, and most AI/visual flows. Prefer actions for
same-origin UI work.

HTTP routes under `src/app/api/` are a thin **job + infra** layer (enqueue
outline/generate/export, Stripe webhook, Inngest, health). They share the same
permissions and rate limits as actions.

| Concern | Primary API |
|---------|-------------|
| Projects, slides, brand, team, share UI | Server Actions |
| Outline / generate / export enqueue | Actions **or** `POST /api/decks/[id]/{outline\|generate\|export}` |
| Job status polling | Actions (`getOutlineJobStatus`, `getExportStatus`, `getAiGenerationStatus`) |
| Stripe / Inngest | HTTP webhooks only |

## API routes (`src/app/api/`)

### Conventions

- Success: `NextResponse.json({ data })`
- Error: `NextResponse.json({ error: { code, message } }, { status })`
- Map action results with `respondFromActionResult` — do **not** wrap
  `{ error: string }` in `new Error(...)` (that forced every failure to 500)
- Thrown `RateLimitError` → **429** + `Retry-After`
- Thrown `PermissionError` → **401** (`unauthorized`) or **403** (`forbidden`)
- Authenticate via Supabase server client session (cookies)
- Authorize: `requireDeckEdit` / org helpers; RLS remains defense in depth

OpenAPI (machine-readable): [`openapi/openapi.yaml`](./openapi/openapi.yaml)

### Route table

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Liveness (no auth) |
| `/api/decks/[id]/outline` | POST | Enqueue AI outline |
| `/api/decks/[id]/generate` | POST | Enqueue slide generation (Inngest) |
| `/api/decks/[id]/export` | POST | Enqueue PPTX export (Inngest) |
| `/api/webhooks/stripe` | POST | Stripe events |
| `/api/inngest` | GET/POST/PUT | Inngest serve endpoint |

### Auth callback

`GET /auth/callback` exchanges the OAuth `code` and redirects to `next`.
`next` is allowlisted via `safeRedirectPath` (relative paths only; blocks
`//…` and absolute URLs).

## Server Actions

Place in `src/lib/actions/` or co-located `actions.ts` in route folders.

```ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateProject(id: string, data: ProjectInput) {
  const supabase = await createClient();
  // validate, update, revalidate
}
```

## Validation

Zod schemas in `src/lib/validations/`. Parse at the boundary:

```ts
const parsed = createProjectSchema.safeParse(body);
if (!parsed.success) return NextResponse.json({ error: ... }, { status: 400 });
```

## Supabase clients

| File | Context |
|------|---------|
| `lib/supabase/server.ts` | Server Components, Actions, API |
| `lib/supabase/client.ts` | Browser (auth UI only) |
| `lib/supabase/middleware.ts` | Session refresh |

Service role client: Inngest jobs and trusted admin paths only.

## Local Inngest development

Run `npm run inngest:dev` or `npm run dev:all` so outline/generate/export/
rewrite/visual/background jobs execute locally.

## Background jobs (Inngest)

| Event | Handler |
|-------|---------|
| `deck/outline.generate` | Generate outline |
| `deck/generate` | Fill slide content from outline |
| `deck/refresh` | Refresh slides from updates |
| `deck/export` | Build PPTX, upload to storage |
| `deck/slide.rewrite` | Rewrite one slide |
| `deck/slide.visual` | Generate/refine slide visual |
| `deck/slide.background` | Generate slide/deck background |

Jobs update row status and store errors on failure. Async AI jobs may write
`ai_generations.result` for client polling.

## Error handling

- Expected errors from actions: `{ error: string }` (UI) or mapped HTTP status via `respondFromActionResult`
- Unexpected errors: log to Sentry, return generic 500
- Never expose stack traces or raw DB errors to the client

## Evolution (when external clients appear)

Prefer a small `/v1` jobs API (enqueue + status + export download) with Bearer
or org API keys and OpenAPI codegen — do not REST-ify all CRUD “for completeness.”
