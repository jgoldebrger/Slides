# Integrations

## Supabase

**Purpose:** Auth, Postgres, Storage, RLS

**Config:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

**Code:** `src/lib/supabase/`

## OpenAI (Vercel AI SDK)

**Purpose:** Generate deck outlines and slide content

**Config:** `OPENAI_API_KEY`

**Code:** `src/lib/ai/`

**Usage logging:** `ai_generations` table (model, tokens, prompt_hash, status)

**TTS (player AI reader):** OpenAI `tts-1` via `POST /api/decks/[id]/narrate`. Voices: alloy, echo, fable, onyx, nova, shimmer. Audio is cached under `slide-assets/{org}/{deck}/tts/`.

**Slide visuals (create / refine / annotate polish):** OpenAI `gpt-image-1`. **Create** uses text generation; **refine** and **annotate polish** use the **images/edits** API with the uploaded source image and user instructions (in-place edit, not a new background). Editor actions return immediately and run in the background (`waitUntil`); the client polls `ai_generations`.

## Inngest

**Purpose:** Background jobs (AI generation, PPTX export, email)

**Config:** `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` (production). Local dev uses `INNGEST_DEV=1` via `npm run dev:all` — no keys required.

**Vercel:** Install the [Inngest Vercel integration](https://www.inngest.com/docs/deploy/vercel) or copy both keys from Inngest → Manage → Keys into your Vercel project environment variables, then redeploy.

**Code:** `src/lib/inngest/`

**Endpoint:** `/api/inngest`

**Local development:** Background jobs require the Inngest Dev Server alongside Next.js:

```bash
npm run dev:all
# or in two terminals:
npm run dev
npm run inngest:dev
```

The dev server syncs functions from `http://localhost:3000/api/inngest`.

## Stripe

**Purpose:** Subscriptions and billing

**Config:** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Code:** `src/lib/stripe/`

**Webhook:** `/api/webhooks/stripe` — verify signature, sync subscription to org

## Resend

**Purpose:** Transactional email (welcome, export ready, invites)

**Config:** `RESEND_API_KEY`

**Code:** `src/lib/email/`

## Sentry

**Purpose:** Error tracking and performance monitoring

**Config:** `SENTRY_DSN`

**Setup:** `@sentry/nextjs` in `next.config` and instrumentation

## PostHog

**Purpose:** Product analytics (funnels, feature usage)

**Config:** `NEXT_PUBLIC_POSTHOG_KEY`

**Scope:** Dashboard client-side only; no PII in event properties

## App URL

**Config:** `NEXT_PUBLIC_APP_URL`

Used for email links, Stripe redirect URLs, OAuth callbacks.

## Adding a new integration

1. Add env keys to `.env.example`
2. Create `src/lib/{provider}/` wrapper module
3. Document in this file
4. Add webhook route if applicable with signature verification
5. Handle missing config gracefully in development
