# Testing

## Tools

| Tool | Scope |
|------|-------|
| Vitest | Unit tests, component tests |
| @testing-library/react | Component rendering and interaction |
| Playwright | End-to-end browser tests |
| jsdom | DOM environment for Vitest |

## Structure

```
src/lib/foo.test.ts              # unit test co-located
src/components/bar.test.tsx      # component test
e2e/
  smoke.spec.ts                  # public smoke (CI)
  auth.setup.ts                  # login + seed storageState
  auth/                          # authenticated auth checks
  decks/                         # editor, export, share, versions
  projects/                      # updates form
  mobile/                        # responsive nav
  pages/                         # page objects
  fixtures/seed.ts               # Supabase admin seed
vitest.config.ts
playwright.config.ts
```

## What to test

### High priority (unit)
- Zod schemas for slide/deck/API input
- Export layout mappers (each layout → PPTX output)
- Pure helpers (share token hash, metrics → chart)

### High priority (E2E)
- Smoke: landing, login form, auth redirect, invalid share view
- Seeded ready deck: editor status, export CTA, version history UI
- Share public view + create link UI
- Failed generation banner
- Mobile nav drawer

### Medium priority
- Server Actions (mock Supabase)
- Slide editor interactions (reorder)

### Low priority
- Snapshot-only UI tests
- Live OpenAI / Stripe flows

## Running tests

```bash
npm test                 # Vitest CI mode
npm run test:e2e         # Playwright smoke only (CI default)
npm run test:e2e:auth    # setup + chromium + mobile (needs E2E creds + service role)
npm run test:e2e:all     # all projects
```

## E2E setup

Required for **smoke** (CI): none beyond app build env.

Required for **authenticated** suite:

| Env | Purpose |
|-----|---------|
| `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` | Seed user login |
| `SUPABASE_SERVICE_ROLE_KEY` | Create deterministic project/decks/share token |
| `NEXT_PUBLIC_SUPABASE_URL` / anon key | App + admin client |

Seed creates:
- Project `E2E Test Project`
- Deck `E2E Ready Deck` (`ready` + slides + revision + share link)
- Deck `E2E Failed Deck` (`failed` for banner UX)

Artifacts land in `e2e/.auth/` (gitignored).

### Patterns

- Prefer `getByRole` / `getByLabel`; use `data-testid` only for stable hooks (`deck-status-badge`, `start-export`, `mobile-nav-open`)
- Page objects in `e2e/pages/`
- No soft `if (visible)` success paths — skip the suite when seed/creds missing
- Never call real OpenAI/Stripe in default E2E; export asserts UI readiness only

## Mocking (Vitest)

```ts
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}));
```

## CI

- `test` job: lint, Vitest, build
- `e2e-smoke` job: Playwright `--project=smoke` after build (`next start`)
- Authenticated E2E is local / optional secrets — not required on every PR

## Cursor skill

Use `.cursor/skills/test-writer/SKILL.md` when writing new tests.
