"use server";

import { createCheckoutSession, createBillingPortalSession } from "@/lib/stripe";
import { requireOrgAdmin, getUserOrg } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export async function getBillingStatus() {
  const { supabase, orgId } = await getUserOrg();
  const { data } = await supabase
    .from("organizations")
    .select("subscription_status, plan_id, stripe_customer_id")
    .eq("id", orgId)
    .single();

  return {
    subscriptionStatus: data?.subscription_status ?? "none",
    planId: data?.plan_id ?? null,
    hasCustomer: Boolean(data?.stripe_customer_id),
  };
}

export async function startBillingCheckout() {
  const { user, orgId } = await requireOrgAdmin();

  if (!user.email) {
    return { error: "Account email required for billing" };
  }

  return createCheckoutSession({
    orgId,
    userId: user.id,
    userEmail: user.email,
  });
}

export async function openBillingPortal() {
  const { orgId } = await requireOrgAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .single();

  if (!data?.stripe_customer_id) {
    return { error: "No billing account found. Start a subscription first." };
  }

  return createBillingPortalSession(data.stripe_customer_id);
}
