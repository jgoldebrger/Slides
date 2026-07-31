# Executive Layout Composition — Design Spec

**Date:** 2026-07-31  
**Status:** Approved  
**Problem owner:** Joel  
**Scope:** Unified slide composition (spacing, hierarchy, density) for preview and PPTX export

## Problem

UpdateDeck slide preview (`slide-preview.tsx`) and PPTX export (`lib/export/layouts/`) each hard-code spacing and typography independently — Tailwind classes like `p-8`, `text-xl`, `mb-4` on one side versus inch coordinates and `fontSize: 16` on the other. `layout-contract.ts` defines which content slots exist per layout but not how they are composed spatially.

Users see slides that feel cramped, flat, and template-y in **both** the in-app preview and exported PowerPoint files.

## Goals

| Goal | Success signal |
|------|----------------|
| Preview/export parity | Title band, content area, and font sizes match within tolerance across surfaces |
| Executive hierarchy | Clear title separation, readable body text (≥14px equivalent in comfort/airy) |
| Content-aware density | Few items → more whitespace; many items → compact but not cramped |
| No fill pipeline changes | Composition derived at render/export time from existing slide content |
| Brand-safe | Branded accent bar and title band geometry consistent in preview and export |

## Non-goals

- New slide layouts or deck types
- AI composition pass
- Manual spacing controls in the slide editor
- Chart styling, AI imagery, or brand color changes (separate concerns)
- Persisting composition to DB in v1
- Rich-text typography beyond container sizing (export still uses plain text)

## Architecture

### Module: `lib/slides/layout-spec.ts`

Sits above renderers, beside `layout-contract.ts`:

```
Slide (layout + content + title)
  → resolveLayoutComposition(slide, { branded })
  → LayoutComposition
       ├─ compositionToPreviewStyles(composition)  → Tailwind classes + inline styles
       └─ compositionToPptxUnits(composition)       → inches, fontSize (pt)
```

### Layout density

`LayoutDensity`: `compact` | `comfort` | `airy`

Chosen deterministically from content volume per layout:

| Signal | compact | comfort | airy |
|--------|---------|---------|------|
| Bullets | ≥5 | 3–4 | ≤2 |
| Metrics | ≥5 | 3–4 | ≤2 |
| Timeline items | ≥6 | 4–5 | ≤3 |
| Body (plain chars) | >200 | 80–200 | ≤80 |
| Chart data points | ≥6 | 4–5 | ≤3 |

Per-layout overrides:

- `title`, `section_break`, `quote` → always `airy`
- `image_caption` → density from body length + optional bullets
- `two_column` → density from max(left bullets, body length)

Density signals use `richTextToPlainText` for body and bullets.

### LayoutComposition (resolved per slide)

Reference canvas: 16:9 (10" × 5.625" for PPTX; aspect-video for preview).

| Field group | Contents |
|-------------|----------|
| Canvas | `padding` (ratio of short edge) |
| Title band | `y`, `height` |
| Content area | `y`, `height`, `gap` |
| Typography | `titleSize`, `bodySize`, `bulletSize`, `metricValueSize`, `metricLabelSize`, `captionSize` — scaled by density |
| Layout-specific | e.g. image column width ratio, metrics grid columns (2 vs 3), timeline item gap |

Base tuning targets executive decks: padding 6–10% of canvas (density-aware), clear title-to-content separation below branded accent bar, body never below 14px equivalent in comfort/airy tiers.

### Renderer integration

| Surface | Change |
|---------|--------|
| `slide-preview.tsx` | Replace ad-hoc spacing/typography with `compositionToPreviewStyles()` |
| `lib/export/pptx.ts` | Title placement and `contentY` from composition (replaces hardcoded 1.5 / 1.65) |
| `lib/export/layouts/index.ts` | Mappers read geometry from `LayoutComposition` via context |

`PptxLayoutContext` gains `composition: LayoutComposition`. Preview resolves composition once per slide in `SlideLayoutContent`.

### Relationship to existing modules

| Module | Responsibility |
|--------|----------------|
| `layout-contract.ts` | Content slots per layout — unchanged |
| `layout-theme.ts` | Brand colors and fonts — unchanged |
| `layout-spec.ts` | Spatial composition and typographic scale |

AI fill prompts unchanged. Better composition appears when slides render or export.

### Persistence

**v1:** Compute at render/export time. No DB migration. Density updates automatically when users edit bullet count or content length.

**v2 (out of scope):** Optional `metadata.composition.density` cache for debugging.

## Data flow

| Path | Trigger |
|------|---------|
| Preview / player | Every `SlidePreview` render |
| PPTX export | Each slide in `generatePptxBuffer` → `addSlideContent` |

`resolveLayoutComposition(slide, { branded })` adjusts title band for accent bar and logo on branded title slides. Colors remain in `layout-theme.ts`.

## Error handling

| Condition | Behavior |
|-----------|----------|
| Empty content (no bullets/metrics/body) | Density `airy`; title-only layout |
| Unknown layout | Fall back to `bullets` composition; log in development |
| Extreme volume (bullets >8, metrics >6, timeline >10) | Cap at `compact`; preview `overflow: auto`; PPTX max height clamp |
| Rich text | Plain-text length for density; sizes apply to rich-text containers |

No content truncation in v1 — scroll/clamp only.

## Testing

| File | Coverage |
|------|----------|
| `layout-spec.test.ts` | `pickDensity` per layout; edge cases (0 and 8 bullets) |
| `layout-spec.test.ts` | `buildLayoutComposition` zones per layout × density |
| `layout-spec-parity.test.ts` | Preview styles vs PPTX units within tolerance |
| `slide-preview.test.tsx` | Compact vs airy title class differences |
| Export layout / `pptx.test.ts` | Uses composition `contentY` and fontSize, not hardcoded values |

### Manual QA

1. 2-bullet slide → airy spacing in preview and PPTX
2. 6-bullet slide → compact but readable
3. Branded export → accent bar + title band aligned in preview and PowerPoint
4. `metrics_grid` with 2 vs 6 metrics → grid density changes
5. `title` and `section_break` → always airy, strong hierarchy

## Files (expected)

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/slides/layout-spec.ts` | Create | Density rules, composition builder, unit converters |
| `src/lib/slides/layout-spec.test.ts` | Create | Density and composition tests |
| `src/lib/slides/layout-spec-parity.test.ts` | Create | Preview/export parity tests |
| `src/components/slides/slide-preview.tsx` | Modify | Consume composition |
| `src/lib/export/pptx.ts` | Modify | Title/contentY from composition |
| `src/lib/export/layouts/types.ts` | Modify | Add `composition` to context |
| `src/lib/export/layouts/index.ts` | Modify | Mappers use composition metrics |
| `src/lib/export/layouts/registry.ts` | Unchanged | Registry only |

## Global constraints

- Next.js 15+ App Router, TypeScript
- No new npm dependencies
- Slide contract: `src/types/slide.ts` — no new layouts
- Org-scoped data unchanged; composition is pure derivation
- Preview must continue to match export layout semantics (presentation-builder rule)
