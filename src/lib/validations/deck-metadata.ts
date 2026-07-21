import { z } from "zod";
import { DECK_AUDIENCES } from "@/lib/ai/audience";
import { deckQaResultSchema } from "@/lib/ai/schemas/deck-ai";

export const deckAudienceSchema = z.enum(DECK_AUDIENCES);

export const deckMetadataSchema = z.object({
  audience: deckAudienceSchema.optional(),
  shareBlurb: z.string().max(1000).optional(),
  lastQa: deckQaResultSchema.optional(),
  chatHistory: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      })
    )
    .max(50)
    .optional(),
  autoRefreshWeekly: z.boolean().optional(),
  forkedFrom: z.string().uuid().optional(),
  translatedLanguage: z.string().optional(),
});

export type DeckMetadata = z.infer<typeof deckMetadataSchema>;

export function parseDeckMetadata(metadata: unknown): DeckMetadata {
  const parsed = deckMetadataSchema.safeParse(metadata ?? {});
  return parsed.success ? parsed.data : {};
}
