import type { SupabaseClient } from "@supabase/supabase-js";
import type { RevisionReason } from "@/lib/decks/revisions";
import { PublicError } from "@/lib/errors/public-error";

export type ReplaceSlideRow = {
  order: number;
  type: string;
  layout: string;
  title: string;
  content: Record<string, unknown>;
  speaker_notes?: string | null;
  metadata?: Record<string, unknown>;
};

export async function replaceDeckSlidesAtomic({
  supabase,
  deckId,
  orgId,
  userId,
  reason,
  slides,
  deckStatus = "ready",
}: {
  supabase: SupabaseClient;
  deckId: string;
  orgId: string;
  userId: string;
  reason: RevisionReason;
  slides: ReplaceSlideRow[];
  deckStatus?: string;
}) {
  const { error } = await supabase.rpc("replace_deck_slides", {
    p_deck_id: deckId,
    p_org_id: orgId,
    p_user_id: userId,
    p_reason: reason,
    p_slides: slides,
    p_deck_status: deckStatus,
  });

  if (error) {
    throw new PublicError("Could not save generated slides. Try again.");
  }
}

export async function restoreDeckRevisionAtomic({
  supabase,
  deckId,
  revisionId,
  userId,
}: {
  supabase: SupabaseClient;
  deckId: string;
  revisionId: string;
  userId: string;
}) {
  const { error } = await supabase.rpc("restore_deck_revision", {
    p_deck_id: deckId,
    p_revision_id: revisionId,
    p_user_id: userId,
  });

  if (error) {
    if (error.message.includes("Revision not found")) {
      throw new PublicError("Revision not found");
    }
    if (error.message.includes("no slides")) {
      throw new PublicError("Revision has no slides to restore");
    }
    throw new PublicError("Could not restore revision. Try again.");
  }
}

export async function applySlideContentBatch({
  supabase,
  deckId,
  updates,
}: {
  supabase: SupabaseClient;
  deckId: string;
  updates: Array<{
    id: string;
    title: string;
    content: Record<string, unknown>;
    speaker_notes?: string;
  }>;
}) {
  const { error } = await supabase.rpc("apply_slide_content_batch", {
    p_deck_id: deckId,
    p_updates: updates,
  });

  if (error) {
    throw new PublicError("Could not apply refreshed slides. Try again.");
  }
}

export async function applyDeckBackgroundBatch({
  supabase,
  deckId,
  backgroundPath,
}: {
  supabase: SupabaseClient;
  deckId: string;
  backgroundPath: string | null;
}) {
  const { error } = await supabase.rpc("apply_deck_background_batch", {
    p_deck_id: deckId,
    p_background_path: backgroundPath,
  });

  if (error) {
    throw new PublicError("Could not update slide backgrounds. Try again.");
  }
}
