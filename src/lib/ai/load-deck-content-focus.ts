import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectUpdateSectionId } from "@/lib/ai/update-sections";
import { defaultIncludedSectionsForProject } from "@/lib/ai/project-updates-context";
import { parseDeckMetadata } from "@/lib/validations/deck-metadata";

export type DeckContentFocus = {
  includedSections: ProjectUpdateSectionId[];
  deckBrief: string;
};

export async function loadDeckContentFocus(
  supabase: SupabaseClient,
  deckId: string,
  updates?: Record<string, unknown> | null
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
      defaultIncludedSectionsForProject(updates),
    deckBrief: metadata.deckBrief ?? "",
  };
}

export function contentFocusFromMetadata(
  metadata: unknown,
  _deckType?: import("@/types/slide").DeckType,
  updates?: Record<string, unknown> | null
): DeckContentFocus {
  const parsed = parseDeckMetadata(metadata);
  return {
    includedSections:
      (parsed.includedSections as ProjectUpdateSectionId[] | undefined) ??
      defaultIncludedSectionsForProject(updates),
    deckBrief: parsed.deckBrief ?? "",
  };
}
