import { describe, it, expect } from "vitest";
import {
  NEUTRAL_SLIDE_COLORS,
  resolveSlideColors,
} from "@/lib/slides/layout-theme";

describe("resolveSlideColors", () => {
  it("When branding is disabled, should return neutral slide palette", () => {
    expect(resolveSlideColors(false, null)).toEqual(NEUTRAL_SLIDE_COLORS);
  });

  it("When branding is enabled with theme, should use org primary and accent", () => {
    const colors = resolveSlideColors(true, {
      primaryColor: "#0F766E",
      accentColor: "#C55221",
      fontStyle: "sans",
    });
    expect(colors.primary).toBe("#0F766E");
    expect(colors.accent).toBe("#C55221");
  });
});
