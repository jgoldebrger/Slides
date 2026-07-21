import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeAiTone, type AiTone } from "@/lib/ai/tone";

/** Load org AI writing tone from brand kit (defaults to executive). */
export async function loadOrgAiTone(
  supabase: SupabaseClient,
  orgId: string
): Promise<AiTone> {
  const { data } = await supabase
    .from("brand_kits")
    .select("ai_tone")
    .eq("org_id", orgId)
    .maybeSingle();

  return normalizeAiTone(data?.ai_tone);
}
