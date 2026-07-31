import type { Slide, SlideLayout } from "@/types/slide";
import { SLIDE_LAYOUTS } from "@/types/slide";
import { richTextToPlainText } from "@/lib/slides/rich-text";

export type LayoutDensity = "compact" | "comfort" | "airy";

export type ContentSignals = {
  bulletCount: number;
  metricCount: number;
  timelineCount: number;
  bodyLength: number;
  chartPointCount: number;
};

const ALWAYS_AIRY: SlideLayout[] = ["title", "section_break", "quote"];

function densityFromCount(
  count: number,
  thresholds: { airy: number; comfort: number }
): LayoutDensity {
  if (count <= thresholds.airy) return "airy";
  if (count <= thresholds.comfort) return "comfort";
  return "compact";
}

function densityFromBodyLength(length: number): LayoutDensity {
  if (length <= 80) return "airy";
  if (length <= 200) return "comfort";
  return "compact";
}

export function countContentSignals(slide: Slide): ContentSignals {
  const bullets = slide.content.bullets ?? [];
  const metrics = slide.content.metrics ?? [];
  const chartData = slide.content.chartData ?? [];
  return {
    bulletCount: bullets.length,
    metricCount: metrics.length,
    timelineCount: slide.layout === "timeline" ? bullets.length : 0,
    bodyLength: richTextToPlainText(slide.content.body).length,
    chartPointCount: chartData.length,
  };
}

export function pickDensity(
  layout: SlideLayout,
  signals: ContentSignals
): LayoutDensity {
  if (ALWAYS_AIRY.includes(layout)) return "airy";

  if (layout === "metrics_grid") {
    return densityFromCount(signals.metricCount, { airy: 2, comfort: 4 });
  }
  if (layout === "timeline") {
    return densityFromCount(signals.timelineCount, { airy: 3, comfort: 5 });
  }
  if (layout === "chart") {
    return densityFromCount(signals.chartPointCount, { airy: 3, comfort: 5 });
  }
  if (layout === "two_column") {
    const maxSignal = Math.max(signals.bulletCount, signals.bodyLength);
    if (maxSignal <= 2 || signals.bodyLength <= 80) return "airy";
    if (maxSignal <= 4 || signals.bodyLength <= 200) return "comfort";
    return "compact";
  }
  if (layout === "image_caption") {
    const combined = Math.max(signals.bulletCount, signals.bodyLength);
    if (combined <= 2 || signals.bodyLength <= 80) return "airy";
    if (combined <= 4 || signals.bodyLength <= 200) return "comfort";
    return "compact";
  }

  const bulletDensity = densityFromCount(signals.bulletCount, {
    airy: 2,
    comfort: 4,
  });
  if (bulletDensity === "compact") return "compact";
  return densityFromBodyLength(signals.bodyLength) === "compact"
    ? "compact"
    : bulletDensity;
}

export const PPTX_SLIDE_WIDTH_IN = 10;
export const PPTX_SLIDE_HEIGHT_IN = 5.625;
export const PREVIEW_REF_WIDTH_PX = 960;

const TYPOGRAPHY: Record<LayoutDensity, LayoutTypography> = {
  airy: {
    titlePt: 32,
    bodyPt: 18,
    bulletPt: 16,
    metricValuePt: 28,
    metricLabelPt: 12,
    captionPt: 14,
  },
  comfort: {
    titlePt: 28,
    bodyPt: 16,
    bulletPt: 15,
    metricValuePt: 24,
    metricLabelPt: 11,
    captionPt: 13,
  },
  compact: {
    titlePt: 24,
    bodyPt: 14,
    bulletPt: 13,
    metricValuePt: 20,
    metricLabelPt: 10,
    captionPt: 12,
  },
};

const PADDING_RATIO: Record<LayoutDensity, number> = {
  airy: 0.08,
  comfort: 0.07,
  compact: 0.06,
};

export type LayoutTypography = {
  titlePt: number;
  bodyPt: number;
  bulletPt: number;
  metricValuePt: number;
  metricLabelPt: number;
  captionPt: number;
};

export type LayoutComposition = {
  layout: SlideLayout;
  density: LayoutDensity;
  branded: boolean;
  paddingIn: number;
  titleYIn: number;
  titleHeightIn: number;
  contentYIn: number;
  contentHeightIn: number;
  contentGapIn: number;
  typography: LayoutTypography;
  metricsCols: 2 | 3;
  imageTextWidthIn: number;
  imageWidthIn: number;
  timelineGapIn: number;
  contentOverflow: "auto" | "visible";
};

export function inToPx(inches: number): number {
  return (inches / PPTX_SLIDE_WIDTH_IN) * PREVIEW_REF_WIDTH_PX;
}

export function ptToPx(pt: number): number {
  return pt * (96 / 72);
}

export function previewCanvasHeightPx(): number {
  return PREVIEW_REF_WIDTH_PX * (PPTX_SLIDE_HEIGHT_IN / PPTX_SLIDE_WIDTH_IN);
}

export function inToPy(inches: number): number {
  return (inches / PPTX_SLIDE_HEIGHT_IN) * previewCanvasHeightPx();
}

export function isExtremeVolume(
  signals: ContentSignals,
  layout: SlideLayout
): boolean {
  if (signals.bulletCount > 8) return true;
  if (signals.metricCount > 6) return true;
  if (signals.timelineCount > 10) return true;
  if (layout === "chart" && signals.chartPointCount > 10) return true;
  return false;
}

function normalizeSlideLayout(layout: string): SlideLayout {
  if ((SLIDE_LAYOUTS as readonly string[]).includes(layout)) {
    return layout as SlideLayout;
  }
  if (process.env.NODE_ENV === "development") {
    console.warn(
      `[layout-spec] Unknown slide layout "${layout}", falling back to bullets`
    );
  }
  return "bullets";
}

export function buildLayoutComposition(
  layout: SlideLayout,
  density: LayoutDensity,
  options?: { branded?: boolean; extremeVolume?: boolean }
): LayoutComposition {
  const branded = options?.branded ?? false;
  const paddingIn = PPTX_SLIDE_HEIGHT_IN * PADDING_RATIO[density];
  const titleYIn = branded ? 0.55 : 0.4;
  const titleHeightIn =
    density === "airy" ? 1.0 : density === "comfort" ? 0.9 : 0.8;
  const contentYIn =
    titleYIn + titleHeightIn + (density === "airy" ? 0.25 : 0.15);
  const contentHeightIn = PPTX_SLIDE_HEIGHT_IN - contentYIn - paddingIn;
  const contentGapIn =
    density === "airy" ? 0.35 : density === "comfort" ? 0.28 : 0.22;
  const imageTextWidthIn = density === "compact" ? 4.2 : 4.3;
  const imageWidthIn = 4.4;
  const metricsCols = density === "compact" ? 3 : 2;
  const timelineGapIn =
    density === "airy" ? 0.6 : density === "comfort" ? 0.5 : 0.45;

  return {
    layout,
    density,
    branded,
    paddingIn,
    titleYIn,
    titleHeightIn,
    contentYIn,
    contentHeightIn,
    contentGapIn,
    typography: TYPOGRAPHY[density],
    metricsCols,
    imageTextWidthIn,
    imageWidthIn,
    timelineGapIn,
    contentOverflow:
      density === "compact" && options?.extremeVolume ? "auto" : "visible",
  };
}

/** PPTX branded accent bar geometry (inches). */
export const BRANDED_ACCENT_BAR = {
  xIn: 0.5,
  yIn: 0.35,
  widthIn: 1.2,
  heightIn: 0.06,
} as const;

const TITLE_CLASS: Record<LayoutDensity, string> = {
  airy: "font-bold tracking-tight",
  comfort: "font-semibold tracking-tight",
  compact: "font-semibold",
};

export type PreviewCompositionStyles = {
  paddingXPx: number;
  paddingBottomPx: number;
  titleTopPx: number;
  titleHeightPx: number;
  contentTopPx: number;
  contentHeightPx: number;
  accentBarTopPx: number;
  accentBarLeftPx: number;
  accentBarWidthPx: number;
  accentBarHeightPx: number;
  titleClass: string;
  titleStyle: { fontSize: string };
  bodyClass: string;
  bodyStyle: { fontSize: string };
  bulletClass: string;
  bulletStyle: { fontSize: string };
  contentClass: string;
  contentGapPx: number;
};

export function resolveLayoutComposition(
  slide: Slide,
  options?: { branded?: boolean }
): LayoutComposition {
  const signals = countContentSignals(slide);
  const layout = normalizeSlideLayout(slide.layout);
  const density = pickDensity(layout, signals);
  return buildLayoutComposition(layout, density, {
    branded: options?.branded,
    extremeVolume: isExtremeVolume(signals, layout),
  });
}

export function compositionToPreviewStyles(
  composition: LayoutComposition
): PreviewCompositionStyles {
  const bodySizePx = ptToPx(composition.typography.bodyPt);
  const bulletSizePx = ptToPx(composition.typography.bulletPt);

  const bulletSpacing =
    composition.density === "airy"
      ? "space-y-3"
      : composition.density === "comfort"
        ? "space-y-2"
        : "space-y-1";

  return {
    paddingXPx: inToPx(composition.paddingIn),
    paddingBottomPx: inToPy(composition.paddingIn),
    titleTopPx: inToPy(composition.titleYIn),
    titleHeightPx: inToPy(composition.titleHeightIn),
    contentTopPx: inToPy(composition.contentYIn),
    contentHeightPx: inToPy(composition.contentHeightIn),
    accentBarTopPx: inToPy(BRANDED_ACCENT_BAR.yIn),
    accentBarLeftPx: inToPx(BRANDED_ACCENT_BAR.xIn),
    accentBarWidthPx: inToPx(BRANDED_ACCENT_BAR.widthIn),
    accentBarHeightPx: inToPy(BRANDED_ACCENT_BAR.heightIn),
    titleClass: TITLE_CLASS[composition.density],
    titleStyle: { fontSize: `${ptToPx(composition.typography.titlePt)}px` },
    bodyClass: composition.density === "compact" ? "" : "leading-relaxed",
    bodyStyle: { fontSize: `${bodySizePx}px` },
    bulletClass: `list-disc pl-5 ${bulletSpacing}`,
    bulletStyle: { fontSize: `${bulletSizePx}px` },
    contentClass:
      composition.contentOverflow === "auto" ? "min-h-0 overflow-auto" : "",
    contentGapPx: inToPy(composition.contentGapIn),
  };
}
