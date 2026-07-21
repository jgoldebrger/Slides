import { describe, expect, it, vi } from "vitest";
import { assertDeckJobEntitlement } from "@/lib/deck-rate-limit";
import { PublicError } from "@/lib/errors/public-error";

vi.mock("@/lib/billing/entitlements", () => ({
  assertOrgCanUsePaidFeatures: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  assertRateLimit: vi.fn(),
}));

import { assertOrgCanUsePaidFeatures } from "@/lib/billing/entitlements";
import { assertRateLimit } from "@/lib/rate-limit";

describe("assertDeckJobEntitlement", () => {
  const supabase = {} as Parameters<typeof assertDeckJobEntitlement>[0];

  it("When billing check fails, should not run rate limit", async () => {
    vi.mocked(assertOrgCanUsePaidFeatures).mockRejectedValueOnce(
      new PublicError("subscription required")
    );

    await expect(
      assertDeckJobEntitlement(supabase, "org-1", "generate")
    ).rejects.toThrow("subscription required");
    expect(assertRateLimit).not.toHaveBeenCalled();
  });

  it("When billing passes, should enforce rate limit", async () => {
    vi.mocked(assertOrgCanUsePaidFeatures).mockResolvedValueOnce(undefined);
    vi.mocked(assertRateLimit).mockResolvedValueOnce(undefined);

    await assertDeckJobEntitlement(supabase, "org-1", "export");
    expect(assertRateLimit).toHaveBeenCalledWith("org-1", "export");
  });
});
