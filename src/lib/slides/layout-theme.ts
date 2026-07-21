import type { BrandPreviewTheme, BrandTheme } from "@/lib/brand";
import { UNBRANDED_PREVIEW_THEME } from "@/lib/brand";
import {
  deriveSlideSupportColors,
  ensureContrastOnWhite,
} from "@/lib/brand-contrast";

export type SlideColors = {
  primary: string;
  accent: string;
  muted: string;
  border: string;
};

export const NEUTRAL_SLIDE_COLORS: SlideColors = {
  primary: "#171717",
  accent: "#525252",
  ...deriveSlideSupportColors("#171717"),
};

export const PPTX_FONT_MAP = {
  sans: "Arial",
  serif: "Georgia",
  mono: "Courier New",
} as const;

export function stripHexHash(color: string): string {
  return color.replace("#", "");
}

export function resolveSlideColors(
  applyBranding: boolean,
  brandTheme?: BrandPreviewTheme | BrandTheme | null
): SlideColors {
  if (!applyBranding || !brandTheme) return NEUTRAL_SLIDE_COLORS;
  const support = deriveSlideSupportColors(brandTheme.primaryColor);
  return {
    primary: brandTheme.primaryColor,
    // Light decorative accents are darkened for readable metric/text chrome
    accent: ensureContrastOnWhite(brandTheme.accentColor, 3),
    muted: support.muted,
    border: support.border,
  };
}

export function isBrandedTheme(theme: BrandTheme): boolean {
  return (
    theme.primaryColor !== UNBRANDED_PREVIEW_THEME.primaryColor ||
    theme.accentColor !== UNBRANDED_PREVIEW_THEME.accentColor ||
    Boolean(theme.logoPath)
  );
}

export const BRAND_KIT_SAMPLE_SLIDE = {
  id: "brand-preview",
  order: 0,
  type: "title" as const,
  layout: "title" as const,
  title: "Quarterly project update",
  content: { body: "Q3 status report" },
};
