import { describe, expect, it, afterEach } from "vitest";
import { stripeWebhookMisconfiguredResponse } from "@/lib/billing/stripe-webhook";

describe("stripeWebhookMisconfiguredResponse", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.VERCEL_ENV = originalVercelEnv;
  });

  it("When NODE_ENV is production, should return 500", () => {
    process.env.NODE_ENV = "production";
    delete process.env.VERCEL_ENV;

    const result = stripeWebhookMisconfiguredResponse();
    expect(result.status).toBe(500);
    expect(result.body.error).toMatch(/not configured/i);
  });

  it("When VERCEL_ENV is production, should return 500", () => {
    process.env.NODE_ENV = "development";
    process.env.VERCEL_ENV = "production";

    const result = stripeWebhookMisconfiguredResponse();
    expect(result.status).toBe(500);
  });

  it("When not in production, should soft-skip for local dev", () => {
    process.env.NODE_ENV = "development";
    delete process.env.VERCEL_ENV;

    const result = stripeWebhookMisconfiguredResponse();
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ received: true, skipped: true });
  });
});
