/**
 * Stripe webhook configuration guard.
 * In production, missing secrets must fail loudly — not silently skip.
 */
export function stripeWebhookMisconfiguredResponse(): {
  status: 500 | 200;
  body: { received: boolean; skipped?: boolean; error?: string };
} {
  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";

  if (isProduction) {
    return {
      status: 500,
      body: { received: false, error: "Stripe webhook is not configured" },
    };
  }

  return { status: 200, body: { received: true, skipped: true } };
}
