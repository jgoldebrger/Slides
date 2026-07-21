import { NextResponse } from "next/server";
import { stripeWebhookMisconfiguredResponse } from "@/lib/billing/stripe-webhook";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

async function recordStripeEvent(event: Stripe.Event, orgId: string | null) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    event_created: event.created,
    org_id: orgId,
  });

  // Unique violation → already processed
  if (error) {
    if (error.code === "23505") return { duplicate: true as const };
    throw error;
  }
  return { duplicate: false as const };
}

async function syncOrgBilling(
  orgId: string,
  data: {
    stripeCustomerId?: string | null;
    subscriptionStatus?: string;
    planId?: string | null;
    eventCreated: number;
  }
) {
  const supabase = createAdminClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_billing_event_created")
    .eq("id", orgId)
    .maybeSingle();

  const lastCreated = org?.stripe_billing_event_created as number | null;
  if (lastCreated != null && data.eventCreated < lastCreated) {
    // Stale event — ignore to preserve newer billing state
    return { skipped: true as const };
  }

  await supabase
    .from("organizations")
    .update({
      stripe_customer_id: data.stripeCustomerId ?? undefined,
      subscription_status: data.subscriptionStatus ?? "none",
      plan_id: data.planId ?? null,
      stripe_billing_event_created: data.eventCreated,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId);

  return { skipped: false as const };
}

async function orgIdFromCustomer(customerId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("organizations")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    const misconfigured = stripeWebhookMisconfiguredResponse();
    return NextResponse.json(misconfigured.body, { status: misconfigured.status });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let orgId: string | null = null;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    orgId = session.metadata?.orgId ?? null;
  } else if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    orgId = await orgIdFromCustomer(customerId);
  }

  const recorded = await recordStripeEvent(event, orgId);
  if (recorded.duplicate) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (orgId) {
      await syncOrgBilling(orgId, {
        stripeCustomerId:
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id,
        subscriptionStatus: "active",
        planId: process.env.STRIPE_PRICE_ID ?? null,
        eventCreated: event.created,
      });
    }
  }

  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id;
    if (orgId) {
      const status =
        event.type === "customer.subscription.deleted"
          ? "canceled"
          : subscription.status;
      const planId = subscription.items.data[0]?.price?.id ?? null;
      await syncOrgBilling(orgId, {
        stripeCustomerId: customerId,
        subscriptionStatus: status,
        planId,
        eventCreated: event.created,
      });
    }
  }

  return NextResponse.json({ received: true });
}
