import { z } from "zod";
import {
  addonLlm,
  groundednessScore,
  routeAddonModel,
  scanSecrets,
  scrubPii,
} from "@/lib/ai/addons/helpers";

export function m73Groundedness(citationCount: number, claimCount: number) {
  return groundednessScore(citationCount, claimCount);
}

export function m74PromptPin(promptHash: string) {
  return { pinnedHash: promptHash, lockedAt: new Date().toISOString() };
}

export async function m75DiffExplain(before: string, after: string) {
  const schema = z.object({
    summary: z.string(),
    reasons: z.array(z.string()),
  });
  return addonLlm(
    schema,
    `Explain why refresh changed content.\nBefore: ${before}\nAfter: ${after}`,
    "strong"
  );
}

export function m76PiiScrub(text: string) {
  return scrubPii(text);
}

export function m77SecretScan(text: string) {
  return scanSecrets(text);
}

export function m78ModelRouter(operation: string) {
  const heavy = ["outline", "portfolio", "exec_digest", "prd"];
  const tier = heavy.some((h) => operation.includes(h)) ? "strong" : "fast";
  return { tier, model: routeAddonModel(tier) };
}

export async function m79EvalHarness(
  outline: unknown,
  golden: unknown
) {
  const schema = z.object({
    score: z.number().min(0).max(100),
    gaps: z.array(z.string()),
  });
  return addonLlm(
    schema,
    `Regression eval vs golden outline.\nCandidate: ${JSON.stringify(outline)}\nGolden: ${JSON.stringify(golden)}`
  );
}

export async function m80FeedbackLoop(
  thumbsUp: boolean,
  featureId: string,
  note?: string
) {
  const schema = z.object({
    weightAdjustment: z.number(),
    summary: z.string(),
  });
  return addonLlm(
    schema,
    `Adjust prompt weight from feedback. Feature: ${featureId}. Positive: ${thumbsUp}. Note: ${note ?? ""}`
  );
}

export function m81WatermarkMeta(generationId: string, promptHash: string) {
  return {
    pptxCustomProps: {
      "UpdateDeck.AiGenerationId": generationId,
      "UpdateDeck.PromptHash": promptHash,
      "UpdateDeck.GeneratedAt": new Date().toISOString(),
    },
  };
}

export function m82RoleAllowlist(
  role: string,
  operation: string
): { allowed: boolean; reason?: string } {
  if (role === "viewer" && /invent|generate|fill|refresh/i.test(operation)) {
    return { allowed: false, reason: "Viewers cannot run invent-adjacent AI ops." };
  }
  return { allowed: true };
}

export async function m83RetentionPolicy(activityCount: number, genCount: number) {
  const schema = z.object({
    suggestDeleteActivityOlderThanDays: z.number(),
    suggestDeleteGenerationsOlderThanDays: z.number(),
    rationale: z.string(),
  });
  return addonLlm(
    schema,
    `Retention policy suggestion. Activity rows: ${activityCount}. Generations: ${genCount}.`
  );
}

export function m84IncidentRollback(lastRevisionId: string, reason: string) {
  return {
    action: "restore_revision",
    revisionId: lastRevisionId,
    reason,
    restoredAt: new Date().toISOString(),
  };
}
