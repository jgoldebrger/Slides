import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { deckOutlineSchema } from "@/lib/validations";
import { buildOutlinePrompt } from "@/lib/ai/prompts/outline";
import type { ContentAnalysis } from "@/lib/ai/analyze-project-updates";
import type { DeckType } from "@/types/slide";

const briefWizardSchema = z.object({
  audience: z.string(),
  outcome: z.string(),
  slideCount: z.number().int().min(2).max(30),
  deckBrief: z.string(),
});

export async function buildBriefFromWizard(input: {
  audience: string;
  outcome: string;
  slideCount: number;
}) {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: briefWizardSchema,
    prompt: `Turn audience "${input.audience}" and outcome "${input.outcome}" into a deck brief targeting ${input.slideCount} slides.`,
  });
  return object;
}

const variantStrategySchema = z.enum([
  "story_led",
  "metrics_led",
  "risk_led",
]);

export async function generateOutlineVariants(args: Parameters<typeof buildOutlinePrompt>[0] & {
  contentAnalysis: ContentAnalysis;
}) {
  const strategies: Array<z.infer<typeof variantStrategySchema>> = [
    "story_led",
    "metrics_led",
    "risk_led",
  ];
  const variants = [];
  for (const strategy of strategies) {
    const prompt =
      buildOutlinePrompt(args) +
      `\nOutline strategy: ${strategy.replace("_", " ")}.`;
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: deckOutlineSchema,
      prompt,
    });
    variants.push({ strategy, outline: object });
  }
  return variants;
}

export async function compressOutlineToBudget(
  outline: z.infer<typeof deckOutlineSchema>,
  targetSlides: number
) {
  const schema = deckOutlineSchema;
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Compress this outline to exactly ${targetSlides} slides. Keep decisions and key metrics.\n${JSON.stringify(outline)}`,
  });
  return object;
}

export async function annotateStoryArc(
  outline: z.infer<typeof deckOutlineSchema>
) {
  const schema = z.object({
    slides: z.array(
      z.object({
        order: z.number(),
        narrativeRole: z.enum([
          "hook",
          "context",
          "proof",
          "tension",
          "resolution",
          "ask",
        ]),
        note: z.string(),
      })
    ),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Label narrative role per slide.\n${JSON.stringify(outline)}`,
  });
  return object;
}

export async function mapClaimsToProof(
  slideText: string,
  updates: Record<string, unknown>
) {
  const schema = z.object({
    claims: z.array(
      z.object({
        claim: z.string(),
        supported: z.boolean(),
        sourceField: z.string().optional(),
        excerpt: z.string().optional(),
      })
    ),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Map claims to project update proof.\nSlide: ${slideText}\nUpdates: ${JSON.stringify(updates)}`,
  });
  return object;
}

export async function simulateToneVariants(
  outline: z.infer<typeof deckOutlineSchema>,
  tones: string[]
) {
  const schema = z.object({
    variants: z.array(
      z.object({ tone: z.string(), titleSamples: z.array(z.string()) })
    ),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Preview outline titles in tones ${tones.join(", ")}.\n${JSON.stringify(outline)}`,
  });
  return object;
}

export async function proposeExecCut(outline: z.infer<typeof deckOutlineSchema>) {
  const schema = z.object({
    keepSlideIndices: z.array(z.number()),
    killReasons: z.array(z.string()),
    compressedOutline: deckOutlineSchema,
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Propose 50% shorter exec cut with keep/kill reasons.\n${JSON.stringify(outline)}`,
  });
  return object;
}

export async function highlightMissingDecisions(
  outline: z.infer<typeof deckOutlineSchema>,
  updates: Record<string, unknown>
) {
  const schema = z.object({
    suggestions: z.array(
      z.object({ title: z.string(), summary: z.string(), reason: z.string() })
    ),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Suggest decision slides if implied but missing.\nOutline: ${JSON.stringify(outline)}\nUpdates: ${JSON.stringify(updates)}`,
  });
  return object;
}

export async function regenerateWithConstraints(
  outline: z.infer<typeof deckOutlineSchema>,
  constraints: string,
  updates: Record<string, unknown>,
  deckType: DeckType
) {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: deckOutlineSchema,
    prompt: `Regenerate outline for ${deckType} with constraints: ${constraints}. Updates: ${JSON.stringify(updates)}. Prior: ${JSON.stringify(outline)}`,
  });
  return object;
}

export async function injectMarketContext(
  outline: z.infer<typeof deckOutlineSchema>,
  userApprovedContext: string
) {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: deckOutlineSchema,
    prompt: `Adjust outline using ONLY this approved context: ${userApprovedContext}\n${JSON.stringify(outline)}`,
  });
  return object;
}
