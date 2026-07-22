import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { deckOutlineSchema } from "@/lib/validations";

export const personaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  promptDna: z.string(),
});

export type Persona = z.infer<typeof personaSchema>;

export async function summarizeStakeholderChangelog(
  previousOutline: unknown,
  currentOutline: unknown
) {
  const schema = z.object({ summary: z.string(), bullets: z.array(z.string()) });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Changelog since last share.\nBefore: ${JSON.stringify(previousOutline)}\nAfter: ${JSON.stringify(currentOutline)}`,
  });
  return object;
}

export async function buildTrendNarrative(
  snapshots: Array<{ label: string; updates: Record<string, unknown> }>
) {
  const schema = z.object({
    trajectory: z.string(),
    highlights: z.array(z.string()),
    risksTrend: z.string().optional(),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Trend over time from snapshots.\n${JSON.stringify(snapshots)}`,
  });
  return object;
}

export async function buildPortfolioRollup(
  projects: Array<{ name: string; updates: Record<string, unknown> }>
) {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: deckOutlineSchema,
    prompt: `Portfolio rollup outline across projects.\n${JSON.stringify(projects)}`,
  });
  return object;
}

export async function extractOrgInsightPatterns(
  decks: Array<{ name: string; outline: unknown }>
) {
  const schema = z.object({
    patterns: z.array(
      z.object({ topic: z.string(), pattern: z.string(), example: z.string() })
    ),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Extract reusable narrative patterns from org decks.\n${JSON.stringify(decks)}`,
  });
  return object;
}

export async function detectRisingRiskLanguage(
  history: Array<{ date: string; updates: Record<string, unknown> }>
) {
  const schema = z.object({
    rising: z.boolean(),
    signals: z.array(z.string()),
    recommendation: z.string(),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Early warning from risk language trend.\n${JSON.stringify(history)}`,
  });
  return object;
}

export async function inferStyleFromReference(description: string) {
  const schema = z.object({
    structureHints: z.array(z.string()),
    toneHints: z.array(z.string()),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Infer structure/tone from reference deck description (no branding copy).\n${description}`,
  });
  return object;
}

export async function trainBrandVoiceSummary(
  approvedDecks: Array<{ name: string; sampleTitles: string[] }>
) {
  const schema = z.object({ voiceSummary: z.string(), doList: z.array(z.string()), avoidList: z.array(z.string()) });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Summarize org brand voice from approved decks.\n${JSON.stringify(approvedDecks)}`,
  });
  return object;
}
