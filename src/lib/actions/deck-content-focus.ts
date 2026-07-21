"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, toPublicError } from "@/lib/errors/public-error";
import { requireDeckEdit } from "@/lib/permissions";
import {
  PROJECT_UPDATE_SECTION_IDS,
  type ProjectUpdateSectionId,
} from "@/lib/ai/update-sections";
import { parseDeckMetadata } from "@/lib/validations/deck-metadata";

const contentFocusSchema = z.object({
  includedSections: z
    .array(z.enum(PROJECT_UPDATE_SECTION_IDS as unknown as [string, ...string[]]))
    .min(1),
  deckBrief: z.string().max(2000).optional(),
});

export async function updateDeckContentFocus(
  deckId: string,
  input: {
    includedSections: ProjectUpdateSectionId[];
    deckBrief?: string;
  }
) {
  const parsed = contentFocusSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid content focus");

  const { supabase } = await requireDeckEdit(deckId);
  const { data: deck } = await supabase
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();

  const metadata = parseDeckMetadata(deck?.metadata);
  const { error } = await supabase
    .from("decks")
    .update({
      metadata: {
        ...metadata,
        includedSections: parsed.data.includedSections,
        deckBrief: parsed.data.deckBrief?.trim() || undefined,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", deckId);

  if (error) return actionError(toPublicError(error));

  revalidatePath(`/decks/${deckId}/outline`);
  revalidatePath(`/decks/${deckId}/editor`);
  return { success: true as const };
}

export async function getDeckContentFocus(deckId: string) {
  const { supabase, deck } = await requireDeckEdit(deckId);
  const metadata = parseDeckMetadata(deck.metadata);
  return {
    includedSections: metadata.includedSections ?? null,
    deckBrief: metadata.deckBrief ?? "",
  };
}
