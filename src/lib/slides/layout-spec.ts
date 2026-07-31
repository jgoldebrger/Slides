import type { Slide, SlideLayout } from "@/types/slide";
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
