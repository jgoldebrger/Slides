import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadOrgAiTone } from "@/lib/ai/load-org-tone";
import { loadDeckAudience } from "@/lib/ai/load-deck-audience";
import { loadOrgDeckStyle } from "@/lib/ai/load-org-deck-style";
import { contentFocusFromMetadata } from "@/lib/ai/load-deck-content-focus";
import { assertProjectContentForGeneration } from "@/lib/ai/no-project-content-error";
import { prepareProjectUpdatesForDeck } from "@/lib/ai/project-updates-context";
import { buildOutlinePrompt } from "@/lib/ai/prompts/outline";
import type { DeckOutline, DeckType } from "@/types/slide";

export async function buildOutlineStreamContext(deckId: string) {
  const supabase = createAdminClient();

  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .single();

  if (deckError || !deck) {
    throw new Error("Deck not found");
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name, description")
    .eq("id", deck.project_id)
    .single();

  const { data: updates } = await supabase
    .from("project_updates")
    .select("*")
    .eq("project_id", deck.project_id)
    .single();

  const existingOutline = deck.outline as DeckOutline | null;

  const { count: slideCount } = await supabase
    .from("slides")
    .select("id", { count: "exact", head: true })
    .eq("deck_id", deckId);

  const aiTone = await loadOrgAiTone(supabase, deck.org_id);
  const audience = await loadDeckAudience(supabase, deckId);
  const orgStyle = await loadOrgDeckStyle(supabase, deck.org_id, deckId);
  const contentFocus = contentFocusFromMetadata(
    deck.metadata,
    deck.type as DeckType,
    updates
  );
  const projectUpdates = prepareProjectUpdatesForDeck(
    updates,
    contentFocus.includedSections
  );
  const contentAnalysis = assertProjectContentForGeneration(projectUpdates);

  const prompt = buildOutlinePrompt({
    deckType: deck.type as DeckType,
    projectName: project?.name ?? "Project",
    projectDescription: project?.description,
    updates: projectUpdates,
    existingOutline,
    existingSlideCount: slideCount ?? 0,
    aiTone,
    audience,
    orgStyleHint: orgStyle?.hint,
    includedSections: contentFocus.includedSections,
    deckBrief: contentFocus.deckBrief,
    contentAnalysis,
  });

  return { supabase, deck, prompt };
}
