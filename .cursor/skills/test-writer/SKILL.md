# Test Writer

Write tests for UpdateDeck using Vitest (unit/component) and Playwright (e2e).

## When to use

- New features in `lib/`, API routes, or critical UI flows
- Bug fixes (write regression test first)

## Unit tests (Vitest)

**Location:** co-located `*.test.ts` / `*.test.tsx`

**Priorities:**
- Zod validation schemas (`slide`, `deck`, API inputs)
- Export layout mappers (`lib/export/layouts/`)
- Pure utility functions in `lib/`

**Patterns:**
```ts
import { describe, it, expect, vi } from 'vitest';

// Mock Supabase at module level
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
```

## Component tests

- `@testing-library/react` + user-event
- Test rendered output and interactions, not internal state
- Mock server actions and Supabase hooks

## E2E tests (Playwright)

**Location:** `e2e/`

**Critical paths:**
1. Smoke — landing, login form, auth redirect, invalid share (CI)
2. Login → seeded ready deck editor / export CTA
3. Share public view + create link
4. Failed generation banner
5. Mobile nav drawer

**Patterns:**
- Page objects in `e2e/pages/`
- Seed via `e2e/fixtures/seed.ts` (service role)
- `page.getByRole` / `getByLabel`; `data-testid` sparingly
- Skip authenticated suites when env/seed missing — never soft-pass

## Rules

- No real OpenAI/Stripe calls in tests
- Deterministic: mock `Date`, random IDs
- Each test independent; clean up created rows
- Name tests: `it('rejects invalid slide layout')`

Reference TESTING.md.
