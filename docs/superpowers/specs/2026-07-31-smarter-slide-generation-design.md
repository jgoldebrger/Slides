# Smarter Slide Generation — Design Spec

**Date:** 2026-07-31  
**Status:** Approved  
**Problem owner:** Joel  
**Scope:** Reduce repetitive slide content (duplicate facts across slides; speaker notes that repeat bullets)

## Problem

When UpdateDeck fills slides from an approved outline, each slide is generated **in isolation** with the **full project update JSON**. The model has no memory of facts already used on prior slides and no instruction to make speaker notes additive. Users see:

1. **Duplicate facts (A)** — the same milestone, metric, or accomplishment on multiple slides.
2. **Redundant speaker notes (D)** — notes restate bullets instead of helping the presenter.

## Goals

| Goal | Success signal |
|------|----------------|
| Exclusive fact usage | Each substantive update item appears on at most one slide |
| Better speaker notes | Notes add emphasis, transition, or audience framing — not bullet paraphrase |
| No regression on safety | Still no invented metrics; org tone, audience, layout schemas unchanged |
| Graceful degradation | Planning failure falls back to current fill behavior |

## Non-goals

- New UI for planning or editing assignments
- Copilot / scoped regenerate changes
- Connector or agent automation
- Outline structure changes (separate concern)

## Architecture

### Two-pass pipeline

```
outline approved
    → extract UpdateFacts[] (deterministic)
    → build SlideContentPlan (LLM, one call)
    → for each slide (sequential):
          fill with scoped facts + alreadyCovered + speaker notes rules
    → replace slides atomically (unchanged)
```

### Update facts

Stable IDs extracted from structured `project_updates`:

| Section | ID pattern | Example |
|---------|------------|---------|
| `goals` | `goal:{index}` | `goal:0` |
| `progress` | `progress:0` | single narrative block |
| `completed_work` | `completed:{index}` | `completed:1` |
| `current_tasks` | `task:{index}` | `task:2` |
| `milestones` | `milestone:{index}` | `milestone:0` |
| `metrics` | `metric:{index}` | `metric:1` |
| `risks` | `risk:{index}` | `risk:0` |
| `blockers` | `blocker:{index}` | `blocker:0` |
| `next_steps` | `next_step:{index}` | `next_step:0` |

Each fact carries: `id`, `section`, `label` (short human label), `payload` (original item for prompt).

### Slide content plan

One `generateObject` call after outline approval, before per-slide fill.

Input: `DeckOutline`, `UpdateFact[]`, `ContentAnalysis`, deck type, audience, tone.

Output per slide index:

```ts
{
  slideIndex: number;
  factIds: string[];      // exclusive across deck (except recap slides)
  role: "content" | "recap" | "title";
  focus: string;          // 1 sentence from outline summary
}
```

Rules enforced in prompt and validated in code:

- Every `factId` assigned to at most one `content` slide
- `recap` / `title` slides may have empty `factIds`
- Unassigned facts logged; appended to best-matching slide or last content slide as fallback

### Slide fill changes

`buildSlideFillPrompt` receives:

- `scopedFacts: UpdateFact[]` — only facts for this slide
- `alreadyCovered: { title: string; summary: string }[]` — prior slides
- `speakerNotesRules` — explicit contract (see below)

Full project JSON is **not** included when a plan exists.

### Speaker notes contract

Added to slide fill prompt:

- 2–4 sentences
- Do **not** copy or lightly rephrase bullet text
- Slide 1: opening framing for audience
- Slide N>1: one-sentence transition from previous slide theme
- May include: what to emphasize, pause, or skip if short on time
- Empty string allowed only for title slides with no body

Post-fill validation (non-blocking): if >60% of bullet words appear in notes, log warning for observability.

## Error handling

| Condition | Behavior |
|-----------|----------|
| Plan LLM fails | Log + use legacy fill (full JSON, no plan) |
| Plan assigns zero facts to slide | Fill from outline summary only; thin content OK |
| Duplicate factIds in plan | Reject plan server-side; retry once; then fallback |
| Empty updates | Existing empty-deck behavior unchanged |

## Testing

| Layer | What |
|-------|------|
| Unit | `extractUpdateFacts` — IDs, counts, edge cases |
| Unit | `validateSlideContentPlan` — no duplicate assignments |
| Unit | `buildSlideFillPrompt` — includes scoped facts, alreadyCovered, notes rules |
| Unit | `speakerNotesRepeatBullets` heuristic |
| Integration | Fixture deck: 3 metrics + 2 milestones → each fact ID in exactly one slide content |

## Files (expected)

| File | Responsibility |
|------|----------------|
| `src/lib/ai/update-facts.ts` | Extract facts with stable IDs |
| `src/lib/ai/slide-content-plan.ts` | Plan schema, validation, LLM call |
| `src/lib/ai/prompts/slide-content-plan.ts` | Planning prompt |
| `src/lib/ai/prompts/slides.ts` | Scoped fill + notes contract |
| `src/lib/ai/fill-deck-slides.ts` | Wire two-pass pipeline |
| `src/lib/ai/speaker-notes.ts` | Notes quality heuristic |

## Global constraints

- Next.js 15+ App Router, TypeScript, Zod validation
- Vercel AI SDK `generateObject` + OpenAI (existing `gpt-4o-mini` for fill; plan may use same model)
- No new npm dependencies
- Org-scoped; no RLS bypass
- Slide contract: `src/types/slide.ts`
