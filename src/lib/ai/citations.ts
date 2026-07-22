import { z } from "zod";

export const sourceCitationSchema = z.object({
  field: z.string(),
  excerpt: z.string().max(500),
  slideOrder: z.number().int().optional(),
});

export const citationsBundleSchema = z.object({
  citations: z.array(sourceCitationSchema).max(20),
});

export type SourceCitation = z.infer<typeof sourceCitationSchema>;
export type CitationsBundle = z.infer<typeof citationsBundleSchema>;

export function parseCitations(value: unknown): SourceCitation[] {
  const parsed = citationsBundleSchema.safeParse(value);
  if (parsed.success) return parsed.data.citations;
  if (Array.isArray(value)) {
    return value
      .map((item) => sourceCitationSchema.safeParse(item))
      .filter((r) => r.success)
      .map((r) => r.data);
  }
  return [];
}

export function citationsPromptBlock(): string {
  return `When stating facts, include sourceCitations: array of { field, excerpt } pointing to project update fields used.`;
}
