# Slide Deck Builder

Build, validate, and export UpdateDeck presentations. Source of truth: `src/types/slide.ts`.

## When to use

- Implementing slide editor, AI generation, or PPTX export
- Adding a new deck type or slide layout

## Deck types

| Type | Purpose |
|------|---------|
| `project_status` | Current state, metrics, blockers |
| `executive_update` | High-level summary for leadership |
| `weekly_report` | Week-over-week progress |
| `rollout_plan` | Timeline, milestones, go-live |
| `project_kickoff` | Goals, team, scope |
| `client_presentation` | External-facing polish |

## Slide JSON contract

```ts
interface Slide {
  id: string;
  order: number;
  type: string;
  layout: SlideLayout;
  title: string;
  content: SlideContent;
  speakerNotes?: string;
  metadata?: Record<string, unknown>;
}
```

### Layout → content mapping

| Layout | Required content fields |
|--------|------------------------|
| `title` | `body?` (subtitle) |
| `bullets` | `bullets: string[]` |
| `metrics_grid` | `metrics: { label, value, trend? }[]` |
| `timeline` | `bullets` or structured in `metadata` |
| `two_column` | `body` + `bullets` or split in `metadata` |
| `image_caption` | `imageUrl`, `imageAlt`, `body?` |
| `chart` | `chartData: Record<string, string\|number>[]` |
| `quote` | `quote`, `attribution?` |
| `section_break` | `body?` |

## Outline contract

```ts
interface DeckOutline {
  deckType: DeckType;
  slides: { title, layout, type, summary }[];
}
```

## Export rules

1. One PPTX slide per `Slide` row, ordered by `order`
2. Apply brand kit when `decks.apply_branding === true`
3. Layout mapper in `lib/export/layouts/` — shared with preview components
4. Output to Supabase Storage `exports/{org_id}/{export_id}.pptx`
5. Update `exports.status`: `pending → processing → completed | failed`

## AI generation rules

1. Input: `project_updates` JSON + deck type
2. Output: valid `DeckOutline` JSON (Zod-validated)
3. Second pass: fill `SlideContent` per approved outline slide
4. Log to `ai_generations` with model, tokens, prompt_hash
5. Max 40 slides per deck

## Validation

Always validate with Zod before DB write or export. Reject unknown `layout` or `deckType` values.
