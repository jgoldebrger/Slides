import type PptxGenJS from "pptxgenjs";
import type { BrandTheme } from "@/lib/brand";
import type { LayoutComposition } from "@/lib/slides/layout-spec";
import type { SlideColors } from "@/lib/slides/layout-theme";
import type { Slide } from "@/types/slide";

export type PptxLayoutContext = {
  pptxSlide: PptxGenJS.Slide;
  slide: Slide;
  theme: BrandTheme;
  colors: SlideColors;
  font: string;
  composition: LayoutComposition;
  branded: boolean;
};

export type PptxLayoutMapper = (ctx: PptxLayoutContext) => void;

export function stripHex(color: string) {
  return color.replace("#", "");
}
