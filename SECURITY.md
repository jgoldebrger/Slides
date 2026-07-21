# Security

## Threat model

Multi-tenant SaaS: primary risk is cross-org data access. Secondary risks: credential leakage, injection, unauthorized billing.

## Authentication

- Supabase Auth with email/password (extendable to OAuth)
- SSR cookie-based sessions via `@supabase/ssr`
- No tokens in localStorage
- OAuth `GET /auth/callback` and login `redirect` only use relative paths (`safeRedirectPath`) — blocks open redirects
- Login / signup / password-reset are rate-limited per email (`assertAuthRateLimit`)
- Password policy: min 12 characters, letter + number (`passwordSchema`)
- Team invites use hashed one-time tokens (`org_invites`) — never create users with admin-chosen plaintext passwords
- `handle_new_user` does **not** trust client `invite_org_id` / `invite_role` metadata
- Welcome email only after authenticated session and email match
- Active org cookie is `httpOnly`, `sameSite=lax`, and `secure` in production
- MFA: not yet implemented (product backlog)

## Authorization

1. **RLS** — Postgres enforces org isolation on every query
2. **API layer** — verify org membership before mutations (defense in depth)
3. **Roles** — `owner`/`admin` for org settings; `member` for project/deck CRUD; `viewer` read/present only
4. Deck edit routes use the **deck org** membership role (`requireDeckAccess`), not only the active-org cookie
5. Team listing uses `profiles.email` — does not call Auth Admin `listUsers`

## Secrets management

| Variable | Exposure |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client-safe |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-safe (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server/Inngest only |
| `OPENAI_API_KEY` | Server only |
| `STRIPE_SECRET_KEY` | Server only |
| All other keys | Server only |

Never commit `.env*` files. Use `.env.example` as template.

## Input validation

- Zod on all API/Action inputs
- Reject unknown enum values (deck type, layout, status)
- File uploads: whitelist MIME types, max size, validate storage path stays within `{org_id}/`

## AI safety

- Don't include secrets, tokens, or unnecessary PII in prompts
- Log `prompt_hash` in `ai_generations` for audit
- Rate limit per org

## Webhooks

- Stripe: verify `stripe-signature` header
- Inngest: verify signing key
- Return 200 quickly; process async

## OWASP mitigations

| Risk | Mitigation |
|------|-----------|
| Injection | Parameterized Supabase queries, Zod validation |
| Broken auth | RLS + session middleware |
| XSS | React escaping; sanitize if rich text added |
| IDOR | org_id checks on every resource access |
| SSRF | No user-controlled outbound URLs |

## Incident response

- Rotate compromised keys immediately
- Check `ai_generations` and audit logs for abuse
- Sentry alerts for auth errors spike
