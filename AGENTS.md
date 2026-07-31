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

## Cursor Cloud specific instructions

The startup update script only runs `npm ci`. Docker, the Supabase CLI, and a system
Google Chrome are pre-provisioned in the VM image but are **not auto-started** — bring
up services yourself in this order. Standard commands (lint/test/build/dev) live in
`package.json`; this section only covers the non-obvious cloud caveats.

### 1. Start Docker, then local Supabase
`dockerd` is not running on a fresh boot; Supabase needs it.
```bash
sudo dockerd >/tmp/dockerd.log 2>&1 &     # wait ~5s until `docker info` works
sudo chmod 666 /var/run/docker.sock       # if docker needs sudo this session
cd /workspace && supabase start           # boots Postgres/Auth/Storage + applies migrations
```
- `supabase/config.toml` sets `auto_expose_new_tables = true`. This is **required**: the
  migrations contain no explicit `GRANT`s and rely on legacy Supabase auto-exposing public
  tables to the `anon`/`authenticated` API roles. Without it every authenticated query fails
  with `permission denied for table ...` (e.g. a blank dashboard + redirect loop).
- Grants are applied when migrations run on a **fresh** DB. If you see `permission denied`
  after a `supabase stop` (which backs up and restores the old volume), recreate the DB with
  `supabase stop --no-backup && supabase start`. Do **not** use `supabase db reset` — it fails
  in this env (`Could not find the supabase-go binary`).

### 2. Environment file
`.env.local` (gitignored) holds the local Supabase URL + JWT keys. Recreate it if missing —
the local keys are deterministic and printed by `supabase status -o env` (map `API_URL` →
`NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SERVICE_ROLE_KEY`
→ `SUPABASE_SERVICE_ROLE_KEY`). Leave `OPENAI_API_KEY` empty unless a real key is supplied;
AI/export flows (OpenAI, Stripe, Resend) degrade gracefully and are otherwise unexercised.

### 3. Run the app
`npm run dev:all` runs Next.js (:3000) + the Inngest dev server (:8288). On first run it
prompts `npx inngest-cli@latest` — answer `y` once (it is then cached). Studio is at
`http://localhost:54323`, captured emails at Mailpit `http://localhost:54324`.

### 4. E2E / browser automation (egress-limited)
`npx playwright install` is **blocked** (`cdn.playwright.dev` unreachable), so the bundled
chromium and its `ffmpeg` (video) are unavailable. A system Chrome exists at
`/usr/bin/google-chrome-stable`. To run Playwright, point it at that binary via a config
override that sets `use.launchOptions.executablePath` (or `channel: "chrome"`) and
`reuseExistingServer: true`; the repo `smoke` suite passes this way. Video recording is not
possible; use `page.screenshot()` for artifacts.

### 5. Lint note
`npm run lint` reports ~12 pre-existing errors (React `setState`-in-effect rule from
`eslint-config-next`) plus unused-var warnings. These exist on `main` and are unrelated to
environment setup.
