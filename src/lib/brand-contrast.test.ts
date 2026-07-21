import { describe, it, expect } from "vitest";
import {
  accentNeedsReadableAdjust,
  contrastRatio,
  deriveSlideSupportColors,
  ensureContrastOnWhite,
  validateBrandKitContrast,
} from "@/lib/brand-contrast";

describe("brand-contrast", () => {
  it("accepts high-contrast brand kit colors", () => {
    expect(validateBrandKitContrast("#171717", "#2563eb")).toBeNull();
  });

  it("rejects low-contrast primary", () => {
    const err = validateBrandKitContrast("#cccccc", "#2563eb");
    expect(err).toMatch(/Primary color contrast/);
  });

  it("allows light decorative accents", () => {
    expect(validateBrandKitContrast("#353131", "#f7f6e9")).toBeNull();
    expect(validateBrandKitContrast("#171717", "#eeeeee")).toBeNull();
  });

  it("flags light accents that need readable adjust", () => {
    expect(accentNeedsReadableAdjust("#f7f6e9")).toBe(true);
    expect(accentNeedsReadableAdjust("#2563eb")).toBe(false);
  });

  it("darkens light accents until readable on white", () => {
    const adjusted = ensureContrastOnWhite("#f7f6e9", 3);
    const ratio = contrastRatio(adjusted, "#ffffff");
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(3);
  });

  it("computes contrast ratio for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("derives muted and border from primary", () => {
    const { muted, border } = deriveSlideSupportColors("#171717");
    expect(muted).toMatch(/^#[0-9a-f]{6}$/i);
    expect(border).toMatch(/^#[0-9a-f]{6}$/i);
    expect(muted).not.toBe("#171717");
    expect(border).not.toBe("#171717");
  });
});
