import { z } from "zod";

export const deckJobEventSchema = z.object({
  deckId: z.string().uuid(),
  userId: z.string().uuid(),
  orgId: z.string().uuid().optional(),
  revisionReason: z
    .enum(["refresh", "regenerate", "manual", "audience_variant", "translate"])
    .optional(),
});

export const exportJobEventSchema = z.object({
  exportId: z.string().uuid(),
  deckId: z.string().uuid(),
  orgId: z.string().uuid().optional(),
});

export const rewriteSlideEventSchema = deckJobEventSchema.extend({
  slideId: z.string().uuid(),
  generationId: z.string().uuid(),
  instructions: z.string().max(500).optional(),
});

export const slideVisualEventSchema = z.object({
  deckId: z.string().uuid(),
  slideId: z.string().uuid(),
  generationId: z.string().uuid(),
  orgId: z.string().uuid().optional(),
  mode: z.enum(["create", "refine", "annotate_polish"]),
  instructions: z.string().optional(),
  visualStyle: z.string().optional(),
  sourcePath: z.string().optional(),
  sourceMimeType: z.string().optional(),
  keepAnnotations: z.boolean().optional(),
});

export const slideBackgroundEventSchema = z.object({
  deckId: z.string().uuid(),
  generationId: z.string().uuid(),
  orgId: z.string().uuid().optional(),
  slideId: z.string().uuid().optional(),
  scope: z.enum(["slide", "deck"]),
  instructions: z.string().optional(),
  style: z.string(),
  variationSeed: z.string(),
});

export const deckAiJobEventSchema = deckJobEventSchema.extend({
  generationId: z.string().uuid(),
});

export const speakerNotesEventSchema = deckAiJobEventSchema.extend({
  slideId: z.string().uuid().optional(),
  scope: z.enum(["slide", "deck"]),
});

export const slideAiJobEventSchema = deckAiJobEventSchema.extend({
  slideId: z.string().uuid(),
});

export const translateDeckEventSchema = deckAiJobEventSchema.extend({
  language: z.enum(["es", "fr", "de", "pt", "ja", "zh"]),
});

export const narrateDeckEventSchema = deckAiJobEventSchema.extend({
  voice: z.string().optional(),
  speed: z.number().min(0.25).max(4).optional(),
});

export function parseEventData<T>(
  schema: z.ZodType<T>,
  data: unknown,
  label: string
): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`Invalid ${label} event payload`);
  }
  return parsed.data;
}
