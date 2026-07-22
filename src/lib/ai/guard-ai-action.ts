import type { SupabaseClient } from "@supabase/supabase-js";
import { scanSecrets } from "@/lib/ai/addons/helpers";
import { assertDeckJobEntitlement } from "@/lib/deck-rate-limit";
import { assertCanEdit } from "@/lib/permissions";

export function assertUserTextSafe(text: string | undefined | null): void {
  if (!text?.trim()) return;
  const scan = scanSecrets(text);
  if (!scan.safe) {
    throw new Error("Secrets detected in input — remove before running AI.");
  }
}

export async function assertAiEntitlement(
  supabase: SupabaseClient,
  orgId: string,
  action: "generate" | "outline" | "export" = "generate"
): Promise<void> {
  await assertDeckJobEntitlement(supabase, orgId, action);
}

export function assertProjectEditor(role: string): void {
  assertCanEdit(role);
}
