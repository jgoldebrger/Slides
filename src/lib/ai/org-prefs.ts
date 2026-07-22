import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import type { AiFeatureId } from "@/lib/ai/feature-flags";

export const orgAiPrefsSchema = z.object({
  preferChartsOverTables: z.boolean().optional(),
  defaultBrevity: z.enum(["concise", "balanced", "detailed"]).optional(),
  requireHitlForNewMetrics: z.boolean().optional(),
  requireHitlForNewRisks: z.boolean().optional(),
  featureOverrides: z.record(z.string(), z.boolean()).optional(),
  naturalLanguageNotes: z.string().max(2000).optional(),
});

export type OrgAiPrefs = z.infer<typeof orgAiPrefsSchema>;

const orgSettingsSchema = z.object({
  aiPrefs: orgAiPrefsSchema.optional(),
});

export function parseOrgSettings(settings: unknown): { aiPrefs: OrgAiPrefs } {
  const parsed = orgSettingsSchema.safeParse(settings ?? {});
  return { aiPrefs: parsed.success ? (parsed.data.aiPrefs ?? {}) : {} };
}

export async function loadOrgAiPrefs(
  supabase: SupabaseClient,
  orgId: string
): Promise<OrgAiPrefs> {
  const { data } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .single();
  return parseOrgSettings(data?.settings).aiPrefs;
}

export async function saveOrgAiPrefs(
  supabase: SupabaseClient,
  orgId: string,
  prefs: OrgAiPrefs
): Promise<void> {
  const { data } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .single();

  const current = parseOrgSettings(data?.settings);
  const { error } = await supabase
    .from("organizations")
    .update({
      settings: { ...current, aiPrefs: prefs },
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  if (error) throw new Error(error.message);
}

const nlPrefsSchema = z.object({
  preferChartsOverTables: z.boolean().optional(),
  defaultBrevity: z.enum(["concise", "balanced", "detailed"]).optional(),
  requireHitlForNewMetrics: z.boolean().optional(),
  requireHitlForNewRisks: z.boolean().optional(),
  summary: z.string(),
});

export async function parseNaturalLanguageAiPrefs(
  instruction: string,
  existing: OrgAiPrefs = {}
): Promise<OrgAiPrefs> {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ...existing,
      naturalLanguageNotes: instruction.trim(),
    };
  }

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: nlPrefsSchema,
    prompt: `Parse this natural-language AI preference instruction for a slide deck SaaS. Merge with existing prefs. Instruction: ${instruction}`,
  });

  return {
    ...existing,
    preferChartsOverTables:
      object.preferChartsOverTables ?? existing.preferChartsOverTables,
    defaultBrevity: object.defaultBrevity ?? existing.defaultBrevity,
    requireHitlForNewMetrics:
      object.requireHitlForNewMetrics ?? existing.requireHitlForNewMetrics,
    requireHitlForNewRisks:
      object.requireHitlForNewRisks ?? existing.requireHitlForNewRisks,
    naturalLanguageNotes: object.summary,
  };
}

export function isFeatureEnabledForOrg(
  featureId: AiFeatureId,
  prefs: OrgAiPrefs
): boolean {
  return Boolean(prefs.featureOverrides?.[featureId]);
}

export function orgPrefsPromptBlock(prefs: OrgAiPrefs): string {
  const parts: string[] = [];
  if (prefs.defaultBrevity === "concise") {
    parts.push("Prefer concise copy.");
  }
  if (prefs.preferChartsOverTables) {
    parts.push("Prefer charts over tables when showing numbers.");
  }
  if (prefs.naturalLanguageNotes?.trim()) {
    parts.push(`Org AI notes: ${prefs.naturalLanguageNotes.trim()}`);
  }
  return parts.length ? parts.join(" ") : "";
}
