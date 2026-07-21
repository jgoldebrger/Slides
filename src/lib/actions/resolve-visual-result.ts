"use client";

import { getActionError } from "@/lib/action-result";

type VisualActionResult = {
  success?: boolean;
  status?: string;
  generationId?: string;
  result?: {
    imagePath?: string;
    imageUrl?: string | null;
    layout?: string;
  };
  error?: unknown;
};

/** Uses inline result when present; otherwise polls a queued generation. */
export async function resolveVisualActionResult(
  deckId: string,
  result: VisualActionResult
) {
  const actionError = getActionError(result);
  if (actionError) throw new Error(actionError);

  if (result.status === "completed" && result.result) {
    return result.result;
  }

  if (!result.generationId) {
    throw new Error("Failed to start visual job");
  }

  const { pollAiGeneration } = await import("@/lib/hooks/poll-ai-generation");
  const done = await pollAiGeneration(deckId, result.generationId);
  return done.result as VisualActionResult["result"];
}
