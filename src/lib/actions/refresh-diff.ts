"use server";

import { buildRefreshDiff } from "@/lib/slides/refresh-diff";
import type { RevisionReason } from "@/lib/decks/revisions";
import type { SlideSnapshot } from "@/lib/decks/revisions";
import { requireDeckAccess } from "@/lib/permissions";
import { actionError, toPublicError } from "@/lib/errors/public-error";

const DIFF_REASONS: RevisionReason[] = [
  "refresh",
  "regenerate",
  "audience_variant",
  "translate",
];

export async function getLatestRefreshDiff(deckId: string) {
  return getLatestDeckDiff(deckId);
}

export async function getLatestDeckDiff(deckId: string) {
  const { supabase } = await requireDeckAccess(deckId);

  const { data: revision, error: revisionError } = await supabase
    .from("deck_revisions")
    .select("id, revision, created_at, slides_snapshot, reason")
    .eq("deck_id", deckId)
    .in("reason", DIFF_REASONS)
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (revisionError) return actionError(toPublicError(revisionError));
  if (!revision) {
    return { success: true as const, diff: null };
  }

  const { data: currentSlides, error: slidesError } = await supabase
    .from("slides")
    .select("id, order, title, content, speaker_notes")
    .eq("deck_id", deckId)
    .order("order");

  if (slidesError) return actionError(toPublicError(slidesError));

  const beforeSlides = (revision.slides_snapshot as SlideSnapshot[]) ?? [];
  const diff = buildRefreshDiff({
    revisionId: revision.id,
    revision: revision.revision,
    refreshedAt: revision.created_at,
    beforeSlides,
    afterSlides: (currentSlides ?? []).map((s) => ({
      id: s.id,
      order: s.order,
      title: s.title,
      content: (s.content as Record<string, unknown>) ?? {},
      speaker_notes: s.speaker_notes,
    })),
  });

  return {
    success: true as const,
    diff: { ...diff, reason: revision.reason as RevisionReason },
  };
}
