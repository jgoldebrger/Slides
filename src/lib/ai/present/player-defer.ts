import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyDeckOwnerOfDeferredQuestion } from "@/lib/email/send-deferred-question";

export async function saveDeferredQuestion({
  supabase,
  orgId,
  deckId,
  shareLinkId,
  question,
  viewerEmail,
}: {
  supabase: SupabaseClient;
  orgId: string;
  deckId: string;
  shareLinkId: string;
  question: string;
  viewerEmail?: string;
}): Promise<void> {
  const { error } = await supabase.from("deferred_questions").insert({
    org_id: orgId,
    deck_id: deckId,
    share_link_id: shareLinkId,
    question,
    viewer_email: viewerEmail ?? null,
    status: "pending",
  });

  if (error) throw error;

  await notifyDeckOwnerOfDeferredQuestion({
    supabase,
    deckId,
    question,
  });
}
