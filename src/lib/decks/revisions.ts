import type { SupabaseClient } from "@supabase/supabase-js";

export type RevisionReason =
  | "refresh"
  | "regenerate"
  | "manual"
  | "audience_variant"
  | "translate";

const MAX_REVISIONS_PER_DECK = 20;

export type SlideSnapshot = {
  order: number;
  type: string;
  layout: string;
  title: string;
  content: Record<string, unknown>;
  speaker_notes: string | null;
  metadata: Record<string, unknown>;
};

export async function snapshotDeckSlides({
  supabase,
  deckId,
  orgId,
  userId,
  reason,
}: {
  supabase: SupabaseClient;
  deckId: string;
  orgId: string;
  userId: string;
  reason: RevisionReason;
}) {
  const { data: slides, error } = await supabase
    .from("slides")
    .select("order, type, layout, title, content, speaker_notes, metadata")
    .eq("deck_id", deckId)
    .order("order");

  if (error) throw new Error(error.message);
  if (!slides?.length) return null;

  const snapshot: SlideSnapshot[] = slides.map((slide) => ({
    order: slide.order,
    type: slide.type,
    layout: slide.layout,
    title: slide.title,
    content: (slide.content as Record<string, unknown>) ?? {},
    speaker_notes: slide.speaker_notes ?? null,
    metadata: (slide.metadata as Record<string, unknown>) ?? {},
  }));

  const { data: revision, error: insertError } = await supabase.rpc(
    "allocate_deck_revision",
    {
      p_deck_id: deckId,
      p_org_id: orgId,
      p_user_id: userId,
      p_reason: reason,
      p_slides_snapshot: snapshot,
      p_max_revisions: MAX_REVISIONS_PER_DECK,
    }
  );

  if (insertError) throw new Error(insertError.message);
  return revision as { id: string; revision: number } | null;
}
