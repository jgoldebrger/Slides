import { sendDeckEvent } from "@/lib/inngest/events";
import { claimDeckJob } from "@/lib/decks/claim-job";
import type { RevisionReason } from "@/lib/decks/revisions";
import { PublicError } from "@/lib/errors/public-error";
import type { SupabaseClient } from "@supabase/supabase-js";

type DeckRow = {
  id: string;
  org_id: string;
  status: string;
};

/**
 * Application service: claim deck generation and publish Inngest event.
 * Callers remain thin adapters (Server Actions).
 */
export async function enqueueGenerateDeckJob({
  supabase,
  deck,
  userId,
}: {
  supabase: SupabaseClient;
  deck: DeckRow;
  userId: string;
}) {
  const claimed = await claimDeckJob(
    supabase,
    deck.id,
    ["draft", "outline", "approved", "ready", "failed"],
    "generating"
  );

  if (!claimed) {
    throw new PublicError("Slide generation is already in progress");
  }

  try {
    await sendDeckEvent("deck/generate", {
      deckId: deck.id,
      userId,
      orgId: deck.org_id,
    });
  } catch (err) {
    await supabase
      .from("decks")
      .update({
        status: deck.status === "generating" ? "approved" : deck.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", deck.id);
    throw err instanceof PublicError
      ? err
      : new PublicError("Failed to start slide generation");
  }
}

export async function enqueueRefreshDeckJob({
  supabase,
  deck,
  userId,
  revisionReason,
}: {
  supabase: SupabaseClient;
  deck: DeckRow;
  userId: string;
  revisionReason?: RevisionReason;
}) {
  const claimed = await claimDeckJob(
    supabase,
    deck.id,
    ["ready", "approved", "outline", "failed"],
    "generating"
  );

  if (!claimed) {
    throw new PublicError("A slide job is already in progress");
  }

  try {
    await sendDeckEvent("deck/refresh", {
      deckId: deck.id,
      userId,
      orgId: deck.org_id,
      revisionReason,
    });
  } catch {
    await supabase
      .from("decks")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", deck.id);
    throw new PublicError("Failed to start refresh");
  }
}

export async function enqueueOutlineDeckJob({
  deckId,
  userId,
  orgId,
}: {
  deckId: string;
  userId: string;
  orgId: string;
}) {
  await sendDeckEvent("deck/outline.generate", {
    deckId,
    userId,
    orgId,
  });
}
