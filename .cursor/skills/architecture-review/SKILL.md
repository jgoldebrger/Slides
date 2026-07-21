# Architecture Review

Evaluate UpdateDeck changes for architectural fit and long-term maintainability.

## When to use

- New features spanning multiple layers
- New integrations or background jobs
- Schema changes or new domain entities

## Evaluate

### Layering
- Routes/actions thin; `lib/` owns business logic
- Clear boundaries: `lib/ai/`, `lib/export/`, `lib/supabase/`
- No circular dependencies

### Domain model
- New entities follow org-scoped pattern (`org_id` + RLS)
- Status enums align with existing (`deck_status`, `export_status`)
- JSONB shapes match TypeScript types in `src/types/`

### Scalability
- Long operations async via Inngest (not blocking HTTP)
- Storage paths follow `{org_id}/{entity_id}/{file}`
- Queries indexed on foreign keys

### Coupling
- Integration code wrapped in provider modules
- Slide layout logic shared between preview and export
- AI prompts versioned/templated, not inline strings everywhere

## Questions to answer

1. Does this belong in a new module or extend an existing one?
2. What breaks if we add a second deck format or export type?
3. Is the change testable without hitting external APIs?

## Output

```markdown
## Architecture Review: [change]

### Verdict: approve | revise | reject

### Concerns
- ...

### Recommendations
- ...
```

Reference ARCHITECTURE.md.
