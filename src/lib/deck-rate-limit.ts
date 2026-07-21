import type { SupabaseClient } from "@supabase/supabase-js";
import { assertOrgCanUsePaidFeatures } from "@/lib/billing/entitlements";
import { assertRateLimit } from "@/lib/rate-limit";

export async function assertDeckJobRateLimit(
  orgId: string,
  action: "outline" | "generate" | "export"
) {
  return assertRateLimit(orgId, action);
}

/** Subscription + per-org rate limit before outline/generate/export jobs. */
export async function assertDeckJobEntitlement(
  supabase: SupabaseClient,
  orgId: string,
  action: "outline" | "generate" | "export"
) {
  await assertOrgCanUsePaidFeatures(supabase, orgId);
  await assertDeckJobRateLimit(orgId, action);
}
