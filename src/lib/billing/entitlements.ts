import type { SupabaseClient } from "@supabase/supabase-js";
import { PublicError } from "@/lib/errors/public-error";
import { getStripe } from "@/lib/stripe";

/** Subscription statuses that unlock AI generation and PPTX export. */
export const PAID_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

/**
 * Billing is enforced only when Stripe is fully configured (secret + price).
 * Local dev without Stripe remains unrestricted.
 */
export function isBillingEnforced(): boolean {
  return (
    getStripe() !== null && Boolean(process.env.STRIPE_PRICE_ID?.trim())
  );
}

export function hasPaidSubscription(status: string | null | undefined): boolean {
  return PAID_SUBSCRIPTION_STATUSES.has(status ?? "none");
}

export async function assertOrgCanUsePaidFeatures(
  supabase: SupabaseClient,
  orgId: string
): Promise<void> {
  if (!isBillingEnforced()) return;

  const { data, error } = await supabase
    .from("organizations")
    .select("subscription_status")
    .eq("id", orgId)
    .single();

  if (error || !data) {
    throw new PublicError("Could not verify subscription status. Try again.");
  }

  if (hasPaidSubscription(data.subscription_status)) return;

  throw new PublicError(
    "An active subscription is required for AI and export features. Visit Settings to subscribe."
  );
}
