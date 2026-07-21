export type BrandFontStyle = "sans" | "serif" | "mono";

export interface BrandTheme {
  primaryColor: string;
  accentColor: string;
  fontStyle: BrandFontStyle;
  logoPath?: string | null;
}

export interface BrandPreviewTheme extends BrandTheme {
  logoUrl?: string | null;
}

export const DEFAULT_BRAND_THEME: BrandTheme = {
  primaryColor: "#171717",
  accentColor: "#2563eb",
  fontStyle: "sans",
};

export const UNBRANDED_PREVIEW_THEME: BrandTheme = {
  primaryColor: "#171717",
  accentColor: "#525252",
  fontStyle: "sans",
  logoPath: null,
};

type BrandKitRow = {
  primary_color?: string | null;
  accent_color?: string | null;
  font_style?: string | null;
  logo_path?: string | null;
} | null;

export function resolveBrandThemeFromKit(brand: BrandKitRow): BrandTheme {
  return {
    primaryColor: brand?.primary_color ?? DEFAULT_BRAND_THEME.primaryColor,
    accentColor: brand?.accent_color ?? DEFAULT_BRAND_THEME.accentColor,
    fontStyle: (brand?.font_style ?? "sans") as BrandFontStyle,
    logoPath: brand?.logo_path ?? null,
  };
}

export function getPreviewFontClass(fontStyle: BrandFontStyle): string {
  switch (fontStyle) {
    case "serif":
      return "font-serif";
    case "mono":
      return "font-mono";
    default:
      return "font-sans";
  }
}
