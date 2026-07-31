import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { ContentAnalysis } from "@/lib/ai/analyze-project-updates";
import type { AiTone } from "@/lib/ai/tone";
import type { DeckAudience } from "@/lib/ai/audience";
import { buildSlideContentPlanPrompt } from "@/lib/ai/prompts/slide-content-plan";
import type { UpdateFact } from "@/lib/ai/update-facts";
import type { DeckOutline, DeckType } from "@/types/slide";

export type SlidePlanRole = "content" | "recap" | "title";

export type SlideContentPlanEntry = {
  slideIndex: number;
  factIds: string[];
  role: SlidePlanRole;
  focus: string;
};

export type SlideContentPlan = {
  entries: SlideContentPlanEntry[];
};

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
  plan: SlideContentPlan,
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

export async function buildSlideContentPlan({
  outline,
  facts,
  contentAnalysis,
}: {
  outline: DeckOutline;
  facts: UpdateFact[];
  contentAnalysis: ContentAnalysis;
  deckType: DeckType;
  aiTone: AiTone;
  audience: DeckAudience;
}): Promise<SlideContentPlan | null> {
  if (!process.env.OPENAI_API_KEY || facts.length === 0) {
    return null;
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: slideContentPlanSchema,
      prompt: buildSlideContentPlanPrompt({ outline, facts, contentAnalysis }),
    });

    const validation = validateSlideContentPlan(
      object,
      facts.map((fact) => fact.id)
    );
    if (!validation.ok) {
      console.warn("[slide-content-plan] validation failed:", validation.error);
      return null;
    }

    return object;
  } catch (err) {
    console.warn(
      "[slide-content-plan] planning failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}
