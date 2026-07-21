# Code Review

Review UpdateDeck code changes for quality, correctness, and convention adherence.

## When to use

- Reviewing PRs or local changes before commit

## Review checklist

### Correctness
- Logic matches requirements; edge cases handled
- Types accurate; no `any` without justification
- Async errors caught and surfaced to user

### Architecture
- Thin routes/actions; logic in `lib/`
- Server vs client component choice correct
- No business logic in middleware

### Conventions
- Matches patterns in ARCHITECTURE.md, FRONTEND.md, BACKEND.md
- Imports use `@/` alias
- Zod schemas for external input

### Data
- Queries scoped by `org_id`
- RLS-compatible (no service role in user paths)
- Migrations include policies

### Tests
- New logic has unit tests where practical
- Critical paths have e2e coverage

## Output format

**Approve** / **Request changes**

| File | Comment |
|------|---------|
| ... | ... |

Prioritize: security > correctness > architecture > style.
