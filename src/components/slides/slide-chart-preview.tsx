"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  normalizeChartData,
  type ChartPoint,
} from "@/lib/slides/metrics-to-chart";

type SlideChartPreviewProps = {
  chartData?: Array<Record<string, string | number>> | null;
  primaryColor: string;
  mutedColor: string;
};

export function SlideChartPreview({
  chartData,
  primaryColor,
  mutedColor,
}: SlideChartPreviewProps) {
  const data: ChartPoint[] = normalizeChartData(chartData);

  if (!data.length) {
    return (
      <div
        className="flex flex-1 items-center justify-center text-sm"
        style={{ color: mutedColor }}
      >
        Add project metrics to populate this chart
      </div>
    );
  }

  const summary = data.map((d) => `${d.name}: ${d.value}`).join("; ");

  return (
    <div className="min-h-0 flex-1 w-full">
      <div className="h-full w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={mutedColor} opacity={0.25} />
            <XAxis
              dataKey="name"
              tick={{ fill: mutedColor, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fill: mutedColor, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: primaryColor, opacity: 0.08 }}
              contentStyle={{
                borderRadius: 8,
                border: `1px solid ${mutedColor}`,
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" fill={primaryColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Bar chart data. {summary}</caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.name}>
              <td>{point.name}</td>
              <td>{point.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
