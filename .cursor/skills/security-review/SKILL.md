# Security Review

Review UpdateDeck code for security vulnerabilities before merge.

## When to use

- Auth, API routes, middleware, or RLS changes
- New integrations (Stripe, OpenAI, file upload)
- Any code handling user input or org-scoped data

## Checklist

### Auth & AuthZ
- [ ] RLS policies cover new tables/columns
- [ ] API routes verify session + org membership
- [ ] No service-role key in client or `NEXT_PUBLIC_*` vars
- [ ] Role checks for admin/owner-only actions

### Input
- [ ] Zod validation on all request bodies
- [ ] File uploads: type check, size limit, safe storage path (`{org_id}/...`)
- [ ] No path traversal in storage operations

### Secrets
- [ ] No hardcoded API keys or tokens
- [ ] `.env*` not committed
- [ ] Logs don't contain passwords, tokens, or PII

### Integrations
- [ ] Stripe webhook signature verified
- [ ] Inngest signing key verified
- [ ] OpenAI prompts don't include secrets
- [ ] SSRF: no user-controlled outbound URLs

### Data
- [ ] Parameterized queries (Supabase client, not raw SQL strings)
- [ ] JSONB content validated before render (XSS if HTML later)

## Output

```markdown
## Security Review

### Risk: [critical/high/medium/low] — [title]
**Location:** file:line
**Issue:** ...
**Fix:** ...
```

Reference SECURITY.md for project-specific policies.
