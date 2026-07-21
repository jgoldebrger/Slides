import { describe, it, expect } from "vitest";
import {
  DEFAULT_BRAND_THEME,
  resolveBrandThemeFromKit,
  UNBRANDED_PREVIEW_THEME,
} from "@/lib/brand";

describe("resolveBrandThemeFromKit", () => {
  it("When brand kit is null, should return default theme tokens", () => {
    const theme = resolveBrandThemeFromKit(null);
    expect(theme).toMatchObject({
      primaryColor: DEFAULT_BRAND_THEME.primaryColor,
      accentColor: DEFAULT_BRAND_THEME.accentColor,
      fontStyle: DEFAULT_BRAND_THEME.fontStyle,
      logoPath: null,
    });
  });

  it("When brand kit has custom colors, should map org fields to theme", () => {
    const theme = resolveBrandThemeFromKit({
      primary_color: "#0F766E",
      accent_color: "#C55221",
      font_style: "serif",
      logo_path: "org/logo.png",
    });
    expect(theme.primaryColor).toBe("#0F766E");
    expect(theme.accentColor).toBe("#C55221");
    expect(theme.fontStyle).toBe("serif");
    expect(theme.logoPath).toBe("org/logo.png");
  });
});

describe("UNBRANDED_PREVIEW_THEME", () => {
  it("When branding is off, should use neutral accent distinct from default blue", () => {
    expect(UNBRANDED_PREVIEW_THEME.accentColor).toBe("#525252");
    expect(UNBRANDED_PREVIEW_THEME.primaryColor).toBe("#171717");
  });
});
