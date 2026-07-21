"use server";

import { revalidatePath } from "next/cache";
import { restoreDeckRevisionAtomic } from "@/lib/decks/slide-mutations";
import { requireDeckEdit } from "@/lib/permissions";
import { actionError, toPublicError } from "@/lib/errors/public-error";

export async function listDeckRevisions(deckId: string) {
  const { supabase } = await requireDeckEdit(deckId);

  const { data, error } = await supabase
    .from("deck_revisions")
    .select("id, revision, reason, created_at, created_by")
    .eq("deck_id", deckId)
    .order("revision", { ascending: false })
    .limit(20);

  if (error) return actionError(toPublicError(error));
  return { success: true as const, revisions: data ?? [] };
}

export async function restoreDeckRevision(deckId: string, revisionId: string) {
  const { supabase, user } = await requireDeckEdit(deckId);

  try {
    await restoreDeckRevisionAtomic({
      supabase,
      deckId,
      revisionId,
      userId: user.id,
    });
  } catch (err) {
    return actionError(toPublicError(err, "Could not restore revision. Try again."));
  }

  revalidatePath(`/decks/${deckId}/editor`);
  return { success: true };
}
