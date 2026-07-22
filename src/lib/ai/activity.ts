import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiFeatureId } from "@/lib/ai/feature-flags";

export type AiActivityEntry = {
  id: string;
  org_id: string;
  deck_id: string | null;
  slide_id: string | null;
  user_id: string | null;
  action: string;
  feature_id: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type LogAiActivityInput = {
  orgId: string;
  deckId?: string;
  slideId?: string;
  userId?: string;
  action: string;
  featureId?: AiFeatureId;
  summary?: string;
  metadata?: Record<string, unknown>;
};

export async function logAiActivity(
  supabase: SupabaseClient,
  input: LogAiActivityInput
): Promise<void> {
  const { error } = await supabase.from("ai_activity").insert({
    org_id: input.orgId,
    deck_id: input.deckId ?? null,
    slide_id: input.slideId ?? null,
    user_id: input.userId ?? null,
    action: input.action,
    feature_id: input.featureId ?? null,
    summary: input.summary ?? null,
    metadata: input.metadata ?? {},
  });
  if (error && process.env.NODE_ENV !== "production") {
    console.error("[ai_activity]", error.message);
  }
}

export async function listAiActivity(
  supabase: SupabaseClient,
  opts: { orgId: string; deckId?: string; limit?: number }
): Promise<AiActivityEntry[]> {
  let query = supabase
    .from("ai_activity")
    .select("*")
    .eq("org_id", opts.orgId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);

  if (opts.deckId) {
    query = query.eq("deck_id", opts.deckId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AiActivityEntry[];
}
