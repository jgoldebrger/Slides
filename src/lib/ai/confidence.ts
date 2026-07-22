import { z } from "zod";

export const confidenceLevelSchema = z.enum(["high", "medium", "low"]);

export const confidenceMetaSchema = z.object({
  level: confidenceLevelSchema,
  reason: z.string().max(300),
  claimCount: z.number().int().min(0).optional(),
});

export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>;
export type ConfidenceMeta = z.infer<typeof confidenceMetaSchema>;

export function parseConfidence(value: unknown): ConfidenceMeta | null {
  const parsed = confidenceMetaSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function inferConfidenceFromCitations(
  citationCount: number,
  totalClaims: number
): ConfidenceMeta {
  if (totalClaims === 0) {
    return { level: "low", reason: "No factual claims detected." };
  }
  const ratio = citationCount / totalClaims;
  if (ratio >= 0.8) {
    return {
      level: "high",
      reason: "Most claims cite project update fields.",
      claimCount: totalClaims,
    };
  }
  if (ratio >= 0.4) {
    return {
      level: "medium",
      reason: "Some claims lack direct citations.",
      claimCount: totalClaims,
    };
  }
  return {
    level: "low",
    reason: "Few claims are grounded in project data.",
    claimCount: totalClaims,
  };
}
