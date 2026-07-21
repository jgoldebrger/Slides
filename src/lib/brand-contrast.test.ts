import { describe, it, expect } from "vitest";
import {
  contrastRatio,
  deriveSlideSupportColors,
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

  it("rejects low-contrast accent", () => {
    const err = validateBrandKitContrast("#171717", "#eeeeee");
    expect(err).toMatch(/Accent color contrast/);
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
