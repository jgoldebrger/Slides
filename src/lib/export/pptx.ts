import type { BrandTheme } from "@/lib/brand";
import {
  PPTX_FONT_MAP,
  resolveSlideColors,
  stripHexHash,
  type SlideColors,
} from "@/lib/slides/layout-theme";
import { PPTX_LAYOUT_MAPPERS } from "@/lib/export/layouts/registry";
import type { Slide, SlideLayout } from "@/types/slide";
import type PptxGenJS from "pptxgenjs";

export type { BrandTheme };

export type PptxExportOptions = {
  branded?: boolean;
  logoUrl?: string | null;
};

type PptxSlide = PptxGenJS.Slide;

function addBrandedAccentBar(pptxSlide: PptxSlide, colors: SlideColors) {
  pptxSlide.addShape("rect", {
    x: 0.5,
    y: 0.35,
    w: 1.2,
    h: 0.06,
    fill: { color: stripHexHash(colors.primary) },
    line: { color: stripHexHash(colors.primary), width: 0 },
  });
}

function addTitleSlideBranding(
  pptxSlide: PptxSlide,
  slide: Slide,
  theme: BrandTheme,
  colors: SlideColors,
  logoUrl?: string | null
) {
  addBrandedAccentBar(pptxSlide, colors);

  let titleY = 1.8;
  if (logoUrl) {
    pptxSlide.addImage({
      path: logoUrl,
      x: 3.5,
      y: 0.9,
      w: 3,
      h: 0.75,
      sizing: { type: "contain", w: 3, h: 0.75 },
    });
    titleY = 2.2;
  }

  const font = PPTX_FONT_MAP[theme.fontStyle];
  pptxSlide.addText(slide.title, {
    x: 0.5,
    y: titleY,
    w: 9,
    h: 1.2,
    fontSize: 32,
    bold: true,
    align: "center",
    color: stripHexHash(colors.primary),
    fontFace: font,
  });

  if (slide.content.body) {
    pptxSlide.addText(slide.content.body, {
      x: 1,
      y: titleY + 1.1,
      w: 8,
      h: 0.8,
      fontSize: 18,
      align: "center",
      color: stripHexHash(colors.muted),
      fontFace: font,
    });
  }
}

function addSlideContent(
  pptxSlide: PptxSlide,
  slide: Slide,
  theme: BrandTheme,
  colors: SlideColors,
  options: PptxExportOptions
) {
  const font = PPTX_FONT_MAP[theme.fontStyle];
  const branded = options.branded ?? false;

  if (branded && slide.layout === "title") {
    addTitleSlideBranding(pptxSlide, slide, theme, colors, options.logoUrl);
    if (slide.speakerNotes) pptxSlide.addNotes(slide.speakerNotes);
    return;
  }

  if (branded) {
    addBrandedAccentBar(pptxSlide, colors);
  }

  pptxSlide.addText(slide.title, {
    x: 0.5,
    y: branded ? 0.55 : 0.4,
    w: 9,
    h: 1,
    fontSize: 28,
    bold: true,
    color: stripHexHash(colors.primary),
    fontFace: font,
  });

  const contentY = branded ? 1.65 : 1.5;
  const mapper = PPTX_LAYOUT_MAPPERS[slide.layout as SlideLayout];
  mapper({
    pptxSlide,
    slide,
    theme,
    colors,
    font,
    contentY,
    branded,
  });

  if (slide.speakerNotes) {
    pptxSlide.addNotes(slide.speakerNotes);
  }
}

export async function generatePptxBuffer(
  slides: Slide[],
  deckName: string,
  theme: BrandTheme,
  options: PptxExportOptions = {}
): Promise<Buffer> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.title = deckName;
  pptx.layout = "LAYOUT_16x9";

  const colors: SlideColors = resolveSlideColors(true, theme);

  for (const slide of slides.sort((a, b) => a.order - b.order)) {
    const pptxSlide = pptx.addSlide();
    if (slide.content.backgroundImageUrl) {
      pptxSlide.background = { path: slide.content.backgroundImageUrl };
    } else {
      pptxSlide.background = { color: "FFFFFF" };
    }
    addSlideContent(pptxSlide, slide, theme, colors, options);
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(output as ArrayBuffer);
}
