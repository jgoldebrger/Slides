import type { SupabaseClient } from "@supabase/supabase-js";
import { PublicError } from "@/lib/errors/public-error";

/**
 * Atomically claim a deck job by CAS on status.
 * Returns true when this caller owns the transition.
 */
export async function claimDeckJob(
  supabase: SupabaseClient,
  deckId: string,
  fromStatuses: string[],
  toStatus: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("claim_deck_job", {
    p_deck_id: deckId,
    p_from_statuses: fromStatuses,
    p_to_status: toStatus,
  });

  if (error) {
    throw new PublicError("Could not start this job. Try again.");
  }

  return Boolean(data);
}
