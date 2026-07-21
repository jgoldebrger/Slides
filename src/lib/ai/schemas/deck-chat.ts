import { z } from "zod";
import { SLIDE_LAYOUTS } from "@/types/slide";

export const deckChatActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("rewrite_slide"),
    slideOrder: z.number().int().min(1),
    instructions: z.string().min(1).max(500),
  }),
  z.object({
    type: z.literal("add_slide"),
    title: z.string().min(1).max(200),
    layout: z.enum(SLIDE_LAYOUTS),
    position: z.number().int().min(1).optional(),
    contentHint: z.string().max(500),
  }),
  z.object({
    type: z.literal("delete_slide"),
    slideOrder: z.number().int().min(1),
  }),
  z.object({
    type: z.literal("select_slide"),
    slideOrder: z.number().int().min(1),
  }),
  z.object({
    type: z.literal("run_deck_qa"),
  }),
  z.object({
    type: z.literal("generate_speaker_notes"),
    slideOrder: z.number().int().min(1).optional(),
  }),
  z.object({
    type: z.literal("reorder_slides"),
    slideOrder: z.number().int().min(1),
    newPosition: z.number().int().min(1),
  }),
]);

export const deckChatResponseSchema = z.object({
  reply: z.string(),
  actions: z.array(deckChatActionSchema).max(5),
});

export type DeckChatAction = z.infer<typeof deckChatActionSchema>;
export type DeckChatResponse = z.infer<typeof deckChatResponseSchema>;
