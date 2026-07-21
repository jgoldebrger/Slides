import type { SupabaseClient } from "@supabase/supabase-js";
import type { DeckAudience } from "@/lib/ai/audience";
import { DECK_AUDIENCE_LABELS } from "@/lib/ai/audience";
import { PublicError } from "@/lib/errors/public-error";

export async function forkDeck({
  supabase,
  sourceDeckId,
  orgId,
  userId,
  audience,
}: {
  supabase: SupabaseClient;
  sourceDeckId: string;
  orgId: string;
  userId: string;
  audience?: DeckAudience;
}) {
  const { data: source, error: sourceError } = await supabase
    .from("decks")
    .select("*")
    .eq("id", sourceDeckId)
    .eq("org_id", orgId)
    .single();

  if (sourceError || !source) {
    throw new PublicError("Deck not found");
  }

  const { data: slides, error: slidesError } = await supabase
    .from("slides")
    .select("order, type, layout, title, content, speaker_notes, metadata")
    .eq("deck_id", sourceDeckId)
    .order("order");

  if (slidesError) throw new PublicError("Could not read slides");
  if (!slides?.length) throw new PublicError("Deck has no slides to fork");

  const audienceLabel = audience ? DECK_AUDIENCE_LABELS[audience] : null;
  const forkName = audienceLabel
    ? `${source.name} (${audienceLabel})`
    : `${source.name} (copy)`;

  const sourceMeta = (source.metadata as Record<string, unknown>) ?? {};
  const { data: forked, error: insertError } = await supabase
    .from("decks")
    .insert({
      project_id: source.project_id,
      org_id: orgId,
      name: forkName,
      type: source.type,
      status: source.status === "ready" ? "ready" : "draft",
      outline: source.outline,
      apply_branding: source.apply_branding,
      metadata: {
        ...sourceMeta,
        audience: audience ?? sourceMeta.audience,
        forkedFrom: sourceDeckId,
      },
      created_by: userId,
    })
    .select("id")
    .single();

  if (insertError || !forked) {
    throw new PublicError("Could not fork deck");
  }

  const slideRows = slides.map((slide) => ({
    deck_id: forked.id,
    order: slide.order,
    type: slide.type,
    layout: slide.layout,
    title: slide.title,
    content: slide.content,
    speaker_notes: slide.speaker_notes,
    metadata: slide.metadata ?? {},
  }));

  const { error: slidesInsertError } = await supabase
    .from("slides")
    .insert(slideRows);

  if (slidesInsertError) {
    await supabase.from("decks").delete().eq("id", forked.id);
    throw new PublicError("Could not copy slides to forked deck");
  }

  return { deckId: forked.id as string, name: forkName };
}
