import { describe, expect, it, vi } from "vitest";
import {
  assertOrgCanUsePaidFeatures,
  hasPaidSubscription,
  PAID_SUBSCRIPTION_STATUSES,
} from "@/lib/billing/entitlements";
import { PublicError } from "@/lib/errors/public-error";

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => null),
}));

describe("billing entitlements", () => {
  describe("hasPaidSubscription", () => {
    it("When status is active or trialing, should allow paid features", () => {
      expect(hasPaidSubscription("active")).toBe(true);
      expect(hasPaidSubscription("trialing")).toBe(true);
    });

    it("When status is none or canceled, should block paid features", () => {
      expect(hasPaidSubscription("none")).toBe(false);
      expect(hasPaidSubscription("canceled")).toBe(false);
      expect(hasPaidSubscription(undefined)).toBe(false);
    });
  });

  describe("assertOrgCanUsePaidFeatures", () => {
    it("When billing is not enforced, should resolve without querying", async () => {
      const supabase = {
        from: vi.fn(),
      } as unknown as Parameters<typeof assertOrgCanUsePaidFeatures>[0];

      await expect(
        assertOrgCanUsePaidFeatures(supabase, "org-1")
      ).resolves.toBeUndefined();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it("When org has active subscription, should allow", async () => {
      const { getStripe } = await import("@/lib/stripe");
      vi.mocked(getStripe).mockReturnValue({} as ReturnType<typeof getStripe>);
      process.env.STRIPE_PRICE_ID = "price_test";

      const supabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { subscription_status: "active" },
                error: null,
              })),
            })),
          })),
        })),
      } as unknown as Parameters<typeof assertOrgCanUsePaidFeatures>[0];

      await expect(
        assertOrgCanUsePaidFeatures(supabase, "org-1")
      ).resolves.toBeUndefined();

      delete process.env.STRIPE_PRICE_ID;
      vi.mocked(getStripe).mockReturnValue(null);
    });

    it("When org has no subscription, should throw PublicError", async () => {
      const { getStripe } = await import("@/lib/stripe");
      vi.mocked(getStripe).mockReturnValue({} as ReturnType<typeof getStripe>);
      process.env.STRIPE_PRICE_ID = "price_test";

      const supabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: { subscription_status: "none" },
                error: null,
              })),
            })),
          })),
        })),
      } as unknown as Parameters<typeof assertOrgCanUsePaidFeatures>[0];

      await expect(assertOrgCanUsePaidFeatures(supabase, "org-1")).rejects.toThrow(
        PublicError
      );

      delete process.env.STRIPE_PRICE_ID;
      vi.mocked(getStripe).mockReturnValue(null);
    });
  });

  it("exports expected paid statuses", () => {
    expect(PAID_SUBSCRIPTION_STATUSES.has("active")).toBe(true);
    expect(PAID_SUBSCRIPTION_STATUSES.has("past_due")).toBe(false);
  });
});
