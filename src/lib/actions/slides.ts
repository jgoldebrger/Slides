"use server";

import { revalidatePath } from "next/cache";
import { requireDeckEdit } from "@/lib/permissions";
import { slideSchema } from "@/lib/validations";
import { actionError, toPublicError } from "@/lib/errors/public-error";

export async function updateSlide(
  slideId: string,
  deckId: string,
  payload: unknown
) {
  const parsed = slideSchema.safeParse(payload);
  if (!parsed.success) return actionError("Invalid slide data");

  const { supabase } = await requireDeckEdit(deckId);
  const { data, error } = await supabase
    .from("slides")
    .update({
      title: parsed.data.title,
      layout: parsed.data.layout,
      type: parsed.data.type,
      content: parsed.data.content,
      speaker_notes: parsed.data.speaker_notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", slideId)
    .eq("deck_id", deckId)
    .select("id")
    .maybeSingle();

  if (error) return actionError(toPublicError(error));
  if (!data) return actionError("Slide not found");

  revalidatePath(`/decks/${deckId}/editor`);
  return { success: true };
}

export async function addSlide(deckId: string) {
  const { supabase } = await requireDeckEdit(deckId);
  const { data: last } = await supabase
    .from("slides")
    .select("order")
    .eq("deck_id", deckId)
    .order("order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const order = (last?.order ?? -1) + 1;
  const { data, error } = await supabase
    .from("slides")
    .insert({
      deck_id: deckId,
      order,
      title: "New slide",
      layout: "bullets",
      type: "content",
      content: { bullets: ["Add content here"] },
    })
    .select("id")
    .single();

  if (error) return actionError(toPublicError(error));
  revalidatePath(`/decks/${deckId}/editor`);
  return { success: true as const, data };
}

export async function deleteSlide(slideId: string, deckId: string) {
  const { supabase } = await requireDeckEdit(deckId);
  const { data, error } = await supabase
    .from("slides")
    .delete()
    .eq("id", slideId)
    .eq("deck_id", deckId)
    .select("id")
    .maybeSingle();

  if (error) return actionError(toPublicError(error));
  if (!data) return actionError("Slide not found");

  revalidatePath(`/decks/${deckId}/editor`);
  return { success: true };
}

export async function reorderSlides(deckId: string, orderedIds: string[]) {
  const { supabase } = await requireDeckEdit(deckId);

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return actionError("Invalid slide order");
  }

  // Two-phase update avoids unique (deck_id, order) collisions mid-reorder
  const tempBase = orderedIds.length + 1000;
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("slides")
      .update({ order: tempBase + i })
      .eq("id", orderedIds[i]!)
      .eq("deck_id", deckId);
    if (error) return actionError(toPublicError(error));
  }

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("slides")
      .update({ order: i })
      .eq("id", orderedIds[i]!)
      .eq("deck_id", deckId);
    if (error) return actionError(toPublicError(error));
  }

  revalidatePath(`/decks/${deckId}/editor`);
  return { success: true };
}
