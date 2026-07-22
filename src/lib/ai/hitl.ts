import type { OrgAiPrefs } from "@/lib/ai/org-prefs";

export type HitlCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; requiresApproval: true };

export function checkHitlForGeneratedContent(
  prefs: OrgAiPrefs,
  proposedUpdates: Record<string, unknown>,
  existingUpdates: Record<string, unknown>
): HitlCheckResult {
  const newMetrics =
    Array.isArray(proposedUpdates.metrics) &&
    JSON.stringify(proposedUpdates.metrics) !==
      JSON.stringify(existingUpdates.metrics ?? []);
  const newRisks =
    Array.isArray(proposedUpdates.risks) &&
    JSON.stringify(proposedUpdates.risks) !==
      JSON.stringify(existingUpdates.risks ?? []);

  if (prefs.requireHitlForNewMetrics && newMetrics) {
    return {
      allowed: false,
      reason: "New metrics require approval per org AI settings.",
      requiresApproval: true,
    };
  }
  if (prefs.requireHitlForNewRisks && newRisks) {
    return {
      allowed: false,
      reason: "New risks require approval per org AI settings.",
      requiresApproval: true,
    };
  }
  return { allowed: true };
}
