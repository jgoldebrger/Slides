"use server";

import { requireDeckAccess } from "@/lib/permissions";

export async function getAiGenerationStatus(
  deckId: string,
  generationId: string
) {
  const { supabase } = await requireDeckAccess(deckId);

  const { data, error } = await supabase
    .from("ai_generations")
    .select("id, status, error, result")
    .eq("id", generationId)
    .eq("deck_id", deckId)
    .single();

  if (error || !data) return { error: "Generation not found" };

  return {
    success: true as const,
    id: data.id as string,
    status: data.status as string,
    error: (data.error as string | null) ?? null,
    result: data.result as Record<string, unknown> | null,
  };
}
