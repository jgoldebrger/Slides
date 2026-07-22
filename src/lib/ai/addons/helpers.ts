import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z, type ZodTypeAny } from "zod";

export type AddonModelTier = "fast" | "strong";

const MODELS: Record<AddonModelTier, string> = {
  fast: "gpt-4o-mini",
  strong: "gpt-4o-mini",
};

export function routeAddonModel(tier: AddonModelTier = "fast"): string {
  return MODELS[tier];
}

export async function addonLlm<T extends ZodTypeAny>(
  schema: T,
  prompt: string,
  tier: AddonModelTier = "fast"
): Promise<z.infer<T>> {
  const { object } = await generateObject({
    model: openai(routeAddonModel(tier)),
    schema,
    prompt,
  });
  return object as z.infer<T>;
}

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const SECRET_PATTERNS = [
  /\bsk-[a-zA-Z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bghp_[a-zA-Z0-9]{36,}\b/,
  /\bxox[baprs]-[a-zA-Z0-9-]{10,}\b/,
];

export function scrubPii(text: string): { scrubbed: string; redactions: number } {
  let redactions = 0;
  let scrubbed = text.replace(EMAIL_RE, () => {
    redactions += 1;
    return "[email]";
  });
  scrubbed = scrubbed.replace(PHONE_RE, () => {
    redactions += 1;
    return "[phone]";
  });
  return { scrubbed, redactions };
}

export function scanSecrets(text: string): { safe: boolean; hits: string[] } {
  const hits: string[] = [];
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(text)) hits.push(pattern.source);
  }
  return { safe: hits.length === 0, hits };
}

export function extractNumbers(text: string): string[] {
  return [...text.matchAll(/-?\d[\d,]*\.?\d*%?/g)].map((m) => m[0]!);
}

export function numbersNotInUpdates(
  slideText: string,
  updates: Record<string, unknown>
): string[] {
  const updateBlob = JSON.stringify(updates);
  const updateNums = new Set(extractNumbers(updateBlob));
  return extractNumbers(slideText).filter((n) => !updateNums.has(n));
}

export function groundednessScore(
  citationCount: number,
  claimCount: number
): { percent: number; level: "high" | "medium" | "low" } {
  if (claimCount === 0) return { percent: 0, level: "low" };
  const percent = Math.round((citationCount / claimCount) * 100);
  if (percent >= 80) return { percent, level: "high" };
  if (percent >= 40) return { percent, level: "medium" };
  return { percent, level: "low" };
}
