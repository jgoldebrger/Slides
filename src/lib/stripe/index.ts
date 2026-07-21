import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }

  return stripeClient;
}

export async function createCheckoutSession({
  orgId,
  userId,
  userEmail,
}: {
  orgId: string;
  userId: string;
  userEmail: string;
}) {
  const stripe = getStripe();
  if (!stripe) {
    return { error: "Stripe is not configured" as const };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!priceId) {
    return { error: "STRIPE_PRICE_ID is not configured" as const };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: userEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?billing=success`,
    cancel_url: `${appUrl}/settings?billing=cancelled`,
    metadata: { orgId, userId },
  });

  return { url: session.url };
}

export async function createBillingPortalSession(customerId: string) {
  const stripe = getStripe();
  if (!stripe) {
    return { error: "Stripe is not configured" as const };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings`,
  });

  return { url: session.url };
}
