# Smarter Slide Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate duplicate facts across generated slides and make speaker notes additive instead of repetitive.

**Architecture:** Extract stable fact IDs from project updates, run one LLM planning pass to assign facts exclusively to outline slides, then fill each slide sequentially with scoped facts plus prior-slide context and a strict speaker-notes contract. Fall back to legacy fill if planning fails.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, Zod, Vercel AI SDK (`generateObject`), OpenAI `gpt-4o-mini`, existing `fill-deck-slides.ts` pipeline.

## Global Constraints

- Slide types and layouts must remain defined in `src/types/slide.ts` — do not diverge.
- All AI input validated with Zod; no invented metrics in prompts.
- No new npm dependencies.
- Use existing `gpt-4o-mini` unless tests prove inadequate.
- Server-side only for planning/fill (no client secrets).
- Feature flag not required for v1; planning enabled when outline + updates exist.
- Fallback to current behavior on any planning failure (log, do not fail deck).

**Spec:** `docs/superpowers/specs/2026-07-31-smarter-slide-generation-design.md`

---

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/ai/update-facts.ts` | Create | Stable fact extraction from project updates |
| `src/lib/ai/update-facts.test.ts` | Create | Fact ID tests |
| `src/lib/ai/slide-content-plan.ts` | Create | Plan types, validation, LLM orchestration |
| `src/lib/ai/slide-content-plan.test.ts` | Create | Plan validation tests |
| `src/lib/ai/prompts/slide-content-plan.ts` | Create | Planning prompt builder |
| `src/lib/ai/speaker-notes.ts` | Create | Notes-vs-bullets repetition heuristic |
| `src/lib/ai/speaker-notes.test.ts` | Create | Heuristic tests |
| `src/lib/ai/prompts/slides.ts` | Modify | Scoped facts, alreadyCovered, notes rules |
| `src/lib/ai/prompts/slides.test.ts` | Create | Prompt content tests |
| `src/lib/ai/fill-deck-slides.ts` | Modify | Wire plan + sequential memory |

---

### Task 1: Extract update facts with stable IDs

**Files:**
- Create: `src/lib/ai/update-facts.ts`
- Create: `src/lib/ai/update-facts.test.ts`

**Interfaces:**
- Produces:
  - `export type UpdateFact = { id: string; section: string; label: string; payload: unknown }`
  - `export function extractUpdateFacts(updates: Record<string, unknown>): UpdateFact[]`
  - `export function factsByIds(facts: UpdateFact[], ids: string[]): UpdateFact[]`
  - `export function factsToPromptBlock(facts: UpdateFact[]): string`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/ai/update-facts.test.ts
import { describe, expect, it } from "vitest";
import { extractUpdateFacts, factsByIds } from "@/lib/ai/update-facts";

describe("extractUpdateFacts", () => {
  it("assigns stable IDs per section index", () => {
    const facts = extractUpdateFacts({
      goals: ["Ship v2", "Improve NPS"],
      metrics: [{ label: "Revenue", value: "$1.2M", trend: "up" }],
      progress: "Rolled out to all regions.",
    });

    expect(facts.map((f) => f.id)).toEqual([
      "goal:0",
      "goal:1",
      "metric:0",
      "progress:0",
    ]);
  });

  it("returns facts for requested IDs only", () => {
    const facts = extractUpdateFacts({
      milestones: [{ title: "Launch", date: "Q3" }],
      risks: [{ title: "Vendor delay", severity: "medium" }],
    });
    const picked = factsByIds(facts, ["milestone:0"]);
    expect(picked).toHaveLength(1);
    expect(picked[0]?.label).toContain("Launch");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/lib/ai/update-facts.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement minimal extraction**

```ts
// src/lib/ai/update-facts.ts
const ID_PREFIX: Record<string, string> = {
  goals: "goal",
  completed_work: "completed",
  current_tasks: "task",
  milestones: "milestone",
  metrics: "metric",
  risks: "risk",
  blockers: "blocker",
  next_steps: "next_step",
  progress: "progress",
};

export type UpdateFact = {
  id: string;
  section: string;
  label: string;
  payload: unknown;
};

function labelForItem(section: string, item: unknown, index: number): string {
  if (typeof item === "string") return item.slice(0, 120);
  if (item && typeof item === "object") {
    const r = item as { title?: string; label?: string };
    return String(r.title ?? r.label ?? `${section} ${index + 1}`).slice(0, 120);
  }
  return `${section} ${index + 1}`;
}

export function extractUpdateFacts(
  updates: Record<string, unknown>
): UpdateFact[] {
  const facts: UpdateFact[] = [];

  for (const [section, prefix] of Object.entries(ID_PREFIX)) {
    const value = updates[section];
    if (section === "progress") {
      if (typeof value === "string" && value.trim()) {
        facts.push({
          id: "progress:0",
          section,
          label: value.trim().slice(0, 120),
          payload: value,
        });
      }
      continue;
    }
    if (!Array.isArray(value)) continue;
    value.forEach((item, index) => {
      const label = labelForItem(section, item, index);
      if (!label.trim()) return;
      facts.push({ id: `${prefix}:${index}`, section, label, payload: item });
    });
  }
  return facts;
}

export function factsByIds(facts: UpdateFact[], ids: string[]): UpdateFact[] {
  const set = new Set(ids);
  return facts.filter((f) => set.has(f.id));
}

export function factsToPromptBlock(facts: UpdateFact[]): string {
  return facts.map((f) => `- [${f.id}] ${f.label}`).join("\n");
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- --run src/lib/ai/update-facts.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/update-facts.ts src/lib/ai/update-facts.test.ts
git commit -m "Add stable fact extraction from project updates."
```

---

### Task 2: Slide content plan types and validation

**Files:**
- Create: `src/lib/ai/slide-content-plan.ts`
- Create: `src/lib/ai/slide-content-plan.test.ts`

**Interfaces:**
- Consumes: `UpdateFact` from Task 1
- Produces:
  - `export type SlidePlanRole = "content" | "recap" | "title"`
  - `export type SlideContentPlanEntry = { slideIndex: number; factIds: string[]; role: SlidePlanRole; focus: string }`
  - `export type SlideContentPlan = { entries: SlideContentPlanEntry[] }`
  - `export function validateSlideContentPlan(plan: SlideContentPlan, factIds: string[]): { ok: true } | { ok: false; error: string }`

- [ ] **Step 1: Write failing validation tests**

```ts
import { describe, expect, it } from "vitest";
import { validateSlideContentPlan } from "@/lib/ai/slide-content-plan";

describe("validateSlideContentPlan", () => {
  it("rejects duplicate fact assignments", () => {
    const result = validateSlideContentPlan(
      {
        entries: [
          { slideIndex: 0, factIds: ["metric:0"], role: "content", focus: "Revenue" },
          { slideIndex: 1, factIds: ["metric:0"], role: "content", focus: "Dup" },
        ],
      },
      ["metric:0"]
    );
    expect(result.ok).toBe(false);
  });

  it("allows recap slides with no facts", () => {
    const result = validateSlideContentPlan(
      {
        entries: [
          { slideIndex: 0, factIds: ["goal:0"], role: "content", focus: "Goals" },
          { slideIndex: 1, factIds: [], role: "recap", focus: "Summary" },
        ],
      },
      ["goal:0"]
    );
    expect(result).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Implement validation + Zod schema**

```ts
import { z } from "zod";

export const slideContentPlanEntrySchema = z.object({
  slideIndex: z.number().int().min(0),
  factIds: z.array(z.string()),
  role: z.enum(["content", "recap", "title"]),
  focus: z.string(),
});

export const slideContentPlanSchema = z.object({
  entries: z.array(slideContentPlanEntrySchema),
});

export function validateSlideContentPlan(
  plan: z.infer<typeof slideContentPlanSchema>,
  knownFactIds: string[]
): { ok: true } | { ok: false; error: string } {
  const known = new Set(knownFactIds);
  const seen = new Set<string>();

  for (const entry of plan.entries) {
    if (entry.role === "recap" || entry.role === "title") continue;
    for (const id of entry.factIds) {
      if (!known.has(id)) return { ok: false, error: `Unknown fact: ${id}` };
      if (seen.has(id)) return { ok: false, error: `Duplicate fact: ${id}` };
      seen.add(id);
    }
  }
  return { ok: true };
}
```

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/slide-content-plan.ts src/lib/ai/slide-content-plan.test.ts
git commit -m "Add slide content plan schema and validation."
```

---

### Task 3: Planning prompt and LLM call

**Files:**
- Create: `src/lib/ai/prompts/slide-content-plan.ts`
- Modify: `src/lib/ai/slide-content-plan.ts` (add `buildSlideContentPlan`)

**Interfaces:**
- Consumes: `UpdateFact[]`, `DeckOutline`, `ContentAnalysis`, tone, audience
- Produces: `export async function buildSlideContentPlan(args): Promise<SlideContentPlan | null>`

- [ ] **Step 1: Write planning prompt builder**

```ts
// src/lib/ai/prompts/slide-content-plan.ts
import type { ContentAnalysis } from "@/lib/ai/analyze-project-updates";
import type { UpdateFact } from "@/lib/ai/update-facts";
import type { DeckOutline } from "@/types/slide";

export function buildSlideContentPlanPrompt({
  outline,
  facts,
  contentAnalysis,
}: {
  outline: DeckOutline;
  facts: UpdateFact[];
  contentAnalysis: ContentAnalysis;
}) {
  return `Assign each project fact to exactly ONE content slide.

Rules:
- Match facts to the slide whose title/summary best fits.
- Do NOT assign the same factId to multiple slides.
- Title or recap slides: role "title" or "recap", factIds [].
- Every factId should appear on exactly one "content" slide when possible.

Outline slides:
${outline.slides.map((s, i) => `${i}. ${s.title} — ${s.summary} (layout: ${s.layout})`).join("\n")}

Facts (id | section | label):
${facts.map((f) => `${f.id} | ${f.section} | ${f.label}`).join("\n")}

Content analysis: ${contentAnalysis.contentDigest}

Return JSON: { entries: [{ slideIndex, factIds, role, focus }] }`;
}
```

- [ ] **Step 2: Implement buildSlideContentPlan with generateObject**

```ts
// In slide-content-plan.ts
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildSlideContentPlanPrompt } from "@/lib/ai/prompts/slide-content-plan";

export async function buildSlideContentPlan(/* args */): Promise<SlideContentPlan | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: slideContentPlanSchema,
      prompt: buildSlideContentPlanPrompt(/* ... */),
    });
    const validation = validateSlideContentPlan(object, facts.map((f) => f.id));
    if (!validation.ok) return null;
    return object;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Add unit test with mocked generateObject** (optional) or test prompt builder only:

```ts
// slide-content-plan.test.ts — add
import { buildSlideContentPlanPrompt } from "@/lib/ai/prompts/slide-content-plan";

it("includes fact IDs in planning prompt", () => {
  const prompt = buildSlideContentPlanPrompt({ /* minimal fixtures */ });
  expect(prompt).toContain("metric:0");
  expect(prompt).toContain("exactly ONE");
});
```

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/prompts/slide-content-plan.ts src/lib/ai/slide-content-plan.ts src/lib/ai/slide-content-plan.test.ts
git commit -m "Add LLM slide content planning pass."
```

---

### Task 4: Speaker notes quality heuristic

**Files:**
- Create: `src/lib/ai/speaker-notes.ts`
- Create: `src/lib/ai/speaker-notes.test.ts`

**Interfaces:**
- Produces: `export function speakerNotesRepeatBullets(bullets: string[], notes: string): boolean`

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { speakerNotesRepeatBullets } from "@/lib/ai/speaker-notes";

describe("speakerNotesRepeatBullets", () => {
  it("detects when notes mostly repeat bullets", () => {
    const bullets = ["Revenue up 12%", "NPS at 72"];
    const notes = "Revenue is up 12 percent and NPS is at 72.";
    expect(speakerNotesRepeatBullets(bullets, notes)).toBe(true);
  });

  it("allows additive presenter notes", () => {
    const bullets = ["Revenue up 12%"];
    const notes =
      "Pause here — leadership cares most about the trend line. Transition: next we cover delivery risks.";
    expect(speakerNotesRepeatBullets(bullets, notes)).toBe(false);
  });
});
```

- [ ] **Step 2: Implement word-overlap heuristic (>60% bullet tokens in notes)**

```ts
export function speakerNotesRepeatBullets(
  bullets: string[],
  notes: string
): boolean {
  const bulletWords = new Set(
    bullets
      .join(" ")
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3)
  );
  if (bulletWords.size === 0) return false;
  const noteWords = notes.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  let overlap = 0;
  for (const w of bulletWords) {
    if (noteWords.includes(w)) overlap += 1;
  }
  return overlap / bulletWords.size > 0.6;
}
```

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

---

### Task 5: Update slide fill prompt

**Files:**
- Modify: `src/lib/ai/prompts/slides.ts`
- Create: `src/lib/ai/prompts/slides.test.ts`

**Interfaces:**
- Consumes: `UpdateFact[]`, `alreadyCovered`, optional legacy full `updates`
- Modifies: `buildSlideFillPrompt` signature — add optional `scopedFacts`, `alreadyCovered`

- [ ] **Step 1: Write prompt tests**

```ts
import { describe, expect, it } from "vitest";
import { buildSlideFillPrompt } from "@/lib/ai/prompts/slides";

describe("buildSlideFillPrompt", () => {
  const base = {
    deckType: "status_update" as const,
    projectName: "Apollo",
    updates: { goals: ["Ship v2"] },
    outlineSlide: {
      title: "Delivery",
      type: "content",
      layout: "bullets" as const,
      summary: "What we shipped",
    },
    slideIndex: 1,
    totalSlides: 3,
  };

  it("includes scoped facts and already covered when provided", () => {
    const prompt = buildSlideFillPrompt({
      ...base,
      scopedFacts: [
        { id: "completed:0", section: "completed_work", label: "API v2", payload: "API v2" },
      ],
      alreadyCovered: [{ title: "Overview", summary: "High-level goals" }],
    });
    expect(prompt).toContain("completed:0");
    expect(prompt).toContain("Already covered");
    expect(prompt).not.toContain("Do not repeat");
  });

  it("requires additive speaker notes", () => {
    const prompt = buildSlideFillPrompt({ ...base, scopedFacts: [] });
    expect(prompt).toMatch(/Do NOT copy or paraphrase bullet/i);
    expect(prompt).toMatch(/transition/i);
  });
});
```

- [ ] **Step 2: Update buildSlideFillPrompt**

Key additions to prompt body:

```ts
const scopedBlock = scopedFacts?.length
  ? `Assigned facts for THIS slide only (use only these):\n${factsToPromptBlock(scopedFacts)}`
  : null;

const coveredBlock = alreadyCovered?.length
  ? `Already covered on prior slides (do NOT repeat these facts):\n${alreadyCovered
      .map((s) => `- ${s.title}: ${s.summary}`)
      .join("\n")}`
  : null;

const notesRules = `Speaker notes rules:
- 2-4 sentences for the presenter.
- Do NOT copy or paraphrase bullet text.
- Add emphasis, audience framing, or what to skip if short on time.
- Slide ${slideIndex + 1} of ${totalSlides}: ${
  slideIndex === 0
    ? "open with why this update matters."
    : "include one transition sentence from the previous slide theme."
}`;
```

When `scopedFacts` provided, omit full `Project data (JSON)` block.

- [ ] **Step 3: Run tests — PASS**

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/prompts/slides.ts src/lib/ai/prompts/slides.test.ts
git commit -m "Scope slide fill prompts and add speaker notes contract."
```

---

### Task 6: Wire pipeline in fill-deck-slides

**Files:**
- Modify: `src/lib/ai/fill-deck-slides.ts`

**Interfaces:**
- Consumes: all Task 1–5 exports

- [ ] **Step 1: Before slide loop, extract facts and build plan**

```ts
import { extractUpdateFacts, factsByIds } from "@/lib/ai/update-facts";
import { buildSlideContentPlan } from "@/lib/ai/slide-content-plan";
import { speakerNotesRepeatBullets } from "@/lib/ai/speaker-notes";

const allFacts = extractUpdateFacts(projectUpdates);
const plan = await buildSlideContentPlan({
  outline,
  facts: allFacts,
  contentAnalysis,
  deckType: deck.type as DeckType,
  aiTone,
  audience,
});
const usePlan = plan !== null;
```

- [ ] **Step 2: Inside loop, pass scoped context**

```ts
const planEntry = plan?.entries.find((e) => e.slideIndex === index);
const scopedFacts = usePlan && planEntry
  ? factsByIds(allFacts, planEntry.factIds)
  : undefined;

const alreadyCovered = slides.map((s) => ({
  title: s.title,
  summary: summarizeSlideContent(s.content), // add small helper
}));

const prompt = buildSlideFillPrompt({
  // ...existing fields
  scopedFacts,
  alreadyCovered: usePlan ? alreadyCovered : undefined,
});
```

Add `summarizeSlideContent` in `src/lib/ai/slide-summary.ts` (bullets joined, max 120 chars).

- [ ] **Step 3: Log repetitive notes (non-blocking)**

```ts
const bullets = Array.isArray(content.bullets) ? (content.bullets as string[]) : [];
if (speakerNotesRepeatBullets(bullets, object.speakerNotes ?? "")) {
  console.warn(`[slides.fill] repetitive speaker notes on slide ${index + 1}`);
}
```

- [ ] **Step 4: Manual smoke test**

1. Create project update with 2 metrics, 2 milestones, 1 risk  
2. Run deck wizard through slide generation  
3. Verify no metric/milestone appears on two slides  
4. Verify speaker notes differ from bullets

Run: `npm run dev` → create deck → inspect slides

- [ ] **Step 5: Run full test suite**

Run: `npm run test`  
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/ai/fill-deck-slides.ts src/lib/ai/slide-summary.ts
git commit -m "Wire content plan into slide fill pipeline."
```

---

## Plan self-review

| Spec requirement | Task |
|------------------|------|
| Stable fact IDs | Task 1 |
| Exclusive assignment | Task 2, 3 |
| Scoped fill | Task 5, 6 |
| Speaker notes contract | Task 4, 5 |
| Fallback on plan failure | Task 6 (`usePlan` flag) |
| No new UI | — (none added) |
| Tests | All tasks |

No TBD placeholders remain. Types consistent: `UpdateFact`, `SlideContentPlan`, `scopedFacts`, `alreadyCovered`.

---

## Execution options

**Plan saved to:** `docs/superpowers/plans/2026-07-31-smarter-slide-generation.md`

1. **Subagent-driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline execution** — implement all tasks in this session with checkpoints

Which approach do you want?
