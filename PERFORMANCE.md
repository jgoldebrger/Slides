# Performance

## Targets

| Metric | Target |
|--------|--------|
| LCP (dashboard) | < 2.5s |
| Deck outline generation | < 15s (async) |
| Full slide generation | < 60s (async) |
| PPTX export | < 30s (async) |

## Server-side

- Select only needed columns from Supabase
- `Promise.all` for independent parallel queries
- Surgical `revalidatePath` — avoid blanket revalidation
- Cache static assets via Next.js defaults

## Client-side

- Dynamic import heavy libs: `pptxgenjs`, `recharts`
- Debounce slide editor autosave (300–500ms)
- Virtualize slide lists if > 50 items
- Minimize `'use client'` boundary scope

## Images

- `next/image` with width/height for screenshots and logos
- Serve via Supabase signed URLs; set reasonable expiry

## Bundle

- Import individual lucide icons, not the full package
- Audit before adding deps: `npx @next/bundle-analyzer`
- Tree-shake unused shadcn components

## AI & jobs

- Never await OpenAI in HTTP handlers — use Inngest
- Stream outline to UI when possible (AI SDK `streamText`)
- Cap slides per deck (40) to control cost and time

## Database

- Index foreign keys (`org_id`, `deck_id`, `project_id`)
- Avoid `select('*')` on JSONB-heavy rows
- Paginate project/deck lists

## Monitoring

- Sentry: error rate, transaction duration
- PostHog: Web Vitals, funnel timing (outline → export)
- Track p95 for `ai_generations` and `exports` completion

## Caching

- Static marketing pages: ISR or static generation
- User-specific data: no CDN cache; rely on RSC per-request fetch
- Signed storage URLs: short TTL (1 hour)
