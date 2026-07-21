# Middleware

## Purpose

Refresh Supabase auth session on every request so Server Components and API routes have a valid session.

## Files

| File | Role |
|------|------|
| `src/middleware.ts` | Entry point, matcher config |
| `src/lib/supabase/middleware.ts` | `updateSession()` — cookie refresh |

## Flow

```
Request → middleware.ts → updateSession()
  → createServerClient with cookie get/set
  → supabase.auth.getUser()
  → refresh cookies if needed
  → redirect if protected route + no session
  → NextResponse.next()
```

## Matcher

Excludes static assets and images:

```
/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)
```

## Route protection

| Route | Access |
|-------|--------|
| `/`, `/login`, `/signup`, `/auth/callback` | Public |
| `/(dashboard)/**` | Authenticated only |

Unauthenticated users on protected routes → redirect to `/login?next={pathname}`

## Rules

- Keep middleware fast — no DB queries or external API calls
- Session refresh only; business authZ happens in routes/actions
- Use `@supabase/ssr` cookie helpers consistently across server/middleware/browser clients

## Debugging

- Check cookies: `sb-*-auth-token` present after login
- If session stale: verify middleware matcher isn't excluding the route
- If redirect loop: confirm `/auth/callback` is in public routes
