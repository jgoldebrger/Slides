import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { DeckQaResult } from "@/lib/ai/schemas/deck-ai";
import { layoutSuggestionHint } from "@/lib/ai/suggest-layout";
import type { SlideLayout } from "@/types/slide";

const rewriteChipSchema = z.enum([
  "shorter",
  "stronger",
  "quantify",
  "soften",
]);

export async function rewriteTextChip(
  text: string,
  chip: z.infer<typeof rewriteChipSchema>
) {
  const schema = z.object({ text: z.string() });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Rewrite (${chip}): ${text}`,
  });
  return object.text;
}

export async function factCheckSlideAgainstUpdates(
  slideContent: string,
  updates: Record<string, unknown>
) {
  const schema = z.object({
    grounded: z.boolean(),
    issues: z.array(
      z.object({
        text: z.string(),
        issue: z.string(),
        suggestedFix: z.string().optional(),
      })
    ),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Fact-check slide vs updates. Flag ungrounded text.\nSlide: ${slideContent}\nUpdates: ${JSON.stringify(updates)}`,
  });
  return object;
}

export function explainLayoutChoice(title: string, summary: string, layout: SlideLayout) {
  const suggested = layoutSuggestionHint(title, summary);
  return {
    currentLayout: layout,
    suggestedLayout: suggested,
    explanation:
      suggested === layout
        ? "Layout matches content shape."
        : `Consider ${suggested} for this content.`,
  };
}

export function rankQaFixes(qa: DeckQaResult) {
  const order = { critical: 0, warning: 1, info: 2 } as const;
  return [...qa.findings].sort(
    (a, b) => order[a.severity] - order[b.severity]
  );
}

export async function detectDuplicateSlides(
  slides: Array<{ title: string; summary?: string; body?: string }>
) {
  const schema = z.object({
    pairs: z.array(
      z.object({
        indexA: z.number(),
        indexB: z.number(),
        overlap: z.string(),
        mergeSuggestion: z.string(),
      })
    ),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Find semantic duplicate slides.\n${JSON.stringify(slides)}`,
  });
  return object;
}

export async function normalizeMetricsAcrossDeck(
  slides: Array<{ title: string; content: unknown }>
) {
  const schema = z.object({
    changes: z.array(
      z.object({ slideIndex: z.number(), before: z.string(), after: z.string() })
    ),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Normalize metric units (%/$/MoM) across deck.\n${JSON.stringify(slides)}`,
  });
  return object;
}

export async function generateRehearsalQa(
  slideTitle: string,
  slideContent: string
) {
  const schema = z.object({
    questions: z.array(z.string()),
    suggestedAnswers: z.array(z.string()),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Audience questions for slide "${slideTitle}": ${slideContent}`,
  });
  return object;
}

export async function suggestImagePlacement(
  slides: Array<{ title: string; layout: string; summary?: string }>
) {
  const schema = z.object({
    recommendations: z.array(
      z.object({
        slideIndex: z.number(),
        needsVisual: z.boolean(),
        rationale: z.string(),
      })
    ),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Recommend which slides need visuals.\n${JSON.stringify(slides)}`,
  });
  return object;
}

export async function respondToAiComment(
  comment: string,
  slideContext: string,
  updates: Record<string, unknown>
) {
  const schema = z.object({ reply: z.string(), suggestedEdit: z.string().optional() });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `AI comment assistant. Comment: ${comment}. Slide: ${slideContext}. Updates: ${JSON.stringify(updates)}`,
  });
  return object;
}
