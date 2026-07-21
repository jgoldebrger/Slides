import type { SlideContent, SlideLayout, SlideMetric } from "@/types/slide";
import {
  metricsToChartData,
  normalizeChartData,
} from "@/lib/slides/metrics-to-chart";

const TRENDS = new Set(["up", "down", "flat"]);

/** Split "Label: value" / "Label | value" style lines into metrics. */
export function bulletsToMetrics(bullets: string[]): SlideMetric[] {
  return bullets
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const pipe = line.indexOf("|");
      const colon = line.indexOf(":");
      const sep =
        pipe >= 0 ? pipe : colon >= 0 && colon < line.length - 1 ? colon : -1;
      if (sep >= 0) {
        const label = line.slice(0, sep).trim();
        const value = line.slice(sep + 1).trim();
        if (label && value) return { label, value };
      }
      return { label: line, value: "—" };
    })
    .slice(0, 6);
}

export function metricsToBullets(metrics: SlideMetric[]): string[] {
  return metrics
    .map((m) => {
      const label = m.label?.trim();
      const value = m.value?.trim();
      if (!label && !value) return "";
      if (!value || value === "—") return label ?? "";
      if (!label) return value;
      return `${label}: ${value}`;
    })
    .filter(Boolean);
}

export function formatMetricsText(metrics: SlideMetric[] | undefined): string {
  if (!metrics?.length) return "";
  return metrics
    .map((m) => `${m.label ?? ""} | ${m.value ?? ""}`.trim())
    .join("\n");
}

export function parseMetricsText(text: string): SlideMetric[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const pipe = line.indexOf("|");
      const colon = line.indexOf(":");
      const sep = pipe >= 0 ? pipe : colon >= 0 ? colon : -1;
      if (sep < 0) return { label: line, value: "—" };
      return {
        label: line.slice(0, sep).trim() || "Metric",
        value: line.slice(sep + 1).trim() || "—",
      };
    })
    .slice(0, 6);
}

function firstText(content: SlideContent): string {
  if (content.body?.trim()) return content.body.trim();
  if (content.quote?.trim()) return content.quote.trim();
  if (content.bullets?.length) return content.bullets[0]!.trim();
  if (content.metrics?.length) {
    const m = content.metrics[0]!;
    return [m.label, m.value].filter(Boolean).join(": ");
  }
  return "";
}

/**
 * Preserve slide substance when the user changes layout.
 * Image/background fields are always kept; layout-specific slots are remapped.
 */
export function remapSlideContentForLayout(
  from: SlideLayout,
  to: SlideLayout,
  content: SlideContent
): SlideContent {
  if (from === to) return content;

  const next: SlideContent = {
    ...content,
    imageUrl: content.imageUrl,
    imagePath: content.imagePath,
    imageAlt: content.imageAlt,
    backgroundImageUrl: content.backgroundImageUrl,
    backgroundImagePath: content.backgroundImagePath,
  };

  const bullets = content.bullets?.filter(Boolean) ?? [];
  const metrics = content.metrics ?? [];
  const chartData = content.chartData;

  switch (to) {
    case "title":
    case "section_break":
      next.body = content.body?.trim() || firstText(content) || content.body;
      break;

    case "bullets":
    case "timeline":
    case "two_column":
    case "image_caption": {
      if (bullets.length) {
        next.bullets = bullets;
      } else if (metrics.length) {
        next.bullets = metricsToBullets(metrics);
      } else if (chartData?.length) {
        next.bullets = normalizeChartData(chartData).map(
          (p) => `${p.name}: ${p.value}`
        );
      } else if (content.quote?.trim()) {
        next.bullets = [content.quote.trim()];
      } else if (content.body?.trim()) {
        next.bullets = [content.body.trim()];
      }
      if (!next.body && content.body) next.body = content.body;
      break;
    }

    case "metrics_grid": {
      if (metrics.length) {
        next.metrics = metrics;
      } else if (bullets.length) {
        next.metrics = bulletsToMetrics(bullets);
      } else if (chartData?.length) {
        next.metrics = normalizeChartData(chartData).map((p) => ({
          label: p.name,
          value: String(p.value),
        }));
      } else if (content.body?.trim()) {
        next.metrics = bulletsToMetrics([content.body.trim()]);
      }
      break;
    }

    case "chart": {
      const fromMetrics = metricsToChartData(metrics);
      if (fromMetrics.length) {
        next.chartData = fromMetrics;
      } else if (chartData?.length) {
        next.chartData = chartData;
      } else if (bullets.length) {
        next.chartData = metricsToChartData(bulletsToMetrics(bullets));
      }
      if (!next.chartData?.length && content.body?.trim()) {
        next.body = content.body;
      }
      break;
    }

    case "quote": {
      next.quote =
        content.quote?.trim() ||
        content.body?.trim() ||
        bullets[0]?.trim() ||
        (metrics[0]
          ? `${metrics[0].label}: ${metrics[0].value}`
          : undefined);
      next.attribution = content.attribution;
      if (!next.quote && content.title === undefined) {
        /* keep empty — title is outside content */
      }
      break;
    }

    default:
      break;
  }

  return next;
}

export function isValidTrend(
  value: string | undefined
): value is NonNullable<SlideMetric["trend"]> {
  return !!value && TRENDS.has(value);
}
