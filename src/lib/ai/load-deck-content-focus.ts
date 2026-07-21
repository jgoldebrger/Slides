import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeckType } from "@/types/slide";
import {
  defaultIncludedSectionsForDeckType,
  type ProjectUpdateSectionId,
} from "@/lib/ai/update-sections";
import { parseDeckMetadata } from "@/lib/validations/deck-metadata";

export type DeckContentFocus = {
  includedSections: ProjectUpdateSectionId[];
  deckBrief: string;
};

export async function loadDeckContentFocus(
  supabase: SupabaseClient,
  deckId: string,
  deckType: DeckType
): Promise<DeckContentFocus> {
  const { data } = await supabase
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();

  const metadata = parseDeckMetadata(data?.metadata);
  return {
    includedSections:
      (metadata.includedSections as ProjectUpdateSectionId[] | undefined) ??
      defaultIncludedSectionsForDeckType(deckType),
    deckBrief: metadata.deckBrief ?? "",
  };
}

export function contentFocusFromMetadata(
  metadata: unknown,
  deckType: DeckType
): DeckContentFocus {
  const parsed = parseDeckMetadata(metadata);
  return {
    includedSections:
      (parsed.includedSections as ProjectUpdateSectionId[] | undefined) ??
      defaultIncludedSectionsForDeckType(deckType),
    deckBrief: parsed.deckBrief ?? "",
  };
}
