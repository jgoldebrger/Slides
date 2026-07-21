export type MetricLike = {
  label?: string;
  value?: string;
  numericValue?: number | null;
  trend?: string;
};

export type ChartPoint = {
  name: string;
  value: number;
};

/**
 * Parse display strings like "42%", "$1.2k", "3,400" into chartable numbers.
 */
export function parseMetricNumeric(
  value: string | number | undefined | null,
  numericValue?: number | null
): number | null {
  if (typeof numericValue === "number" && Number.isFinite(numericValue)) {
    return numericValue;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string" || !value.trim()) return null;

  const cleaned = value.trim().toLowerCase().replace(/[$,\s]/g, "");
  const percent = cleaned.endsWith("%");
  const base = percent ? cleaned.slice(0, -1) : cleaned;

  const multiplier = base.endsWith("k")
    ? 1000
    : base.endsWith("m")
      ? 1_000_000
      : 1;
  const numericPart = multiplier === 1 ? base : base.slice(0, -1);
  const parsed = Number.parseFloat(numericPart);
  if (!Number.isFinite(parsed)) return null;
  return parsed * multiplier;
}

export function metricsToChartData(metrics: MetricLike[] | unknown): ChartPoint[] {
  if (!Array.isArray(metrics)) return [];

  return metrics
    .map((metric, index) => {
      if (!metric || typeof metric !== "object") return null;
      const row = metric as MetricLike;
      const value = parseMetricNumeric(row.value, row.numericValue);
      if (value === null) return null;
      const name =
        (typeof row.label === "string" && row.label.trim()) || `Metric ${index + 1}`;
      return { name, value };
    })
    .filter((point): point is ChartPoint => point !== null)
    .slice(0, 12);
}

export function normalizeChartData(
  chartData: Array<Record<string, string | number>> | undefined | null
): ChartPoint[] {
  if (!Array.isArray(chartData)) return [];

  return chartData
    .map((point, index) => {
      const name = String(point.name ?? point.label ?? `Item ${index + 1}`);
      const value = parseMetricNumeric(
        point.value as string | number | undefined,
        typeof point.numericValue === "number" ? point.numericValue : null
      );
      if (value === null) return null;
      return { name, value };
    })
    .filter((point): point is ChartPoint => point !== null);
}

/**
 * Prefer real project metrics when available; otherwise normalize AI chartData.
 */
export function resolveChartData({
  metrics,
  chartData,
}: {
  metrics?: MetricLike[] | unknown;
  chartData?: Array<Record<string, string | number>> | null;
}): ChartPoint[] {
  const fromMetrics = metricsToChartData(metrics);
  if (fromMetrics.length >= 1) return fromMetrics;
  return normalizeChartData(chartData);
}
