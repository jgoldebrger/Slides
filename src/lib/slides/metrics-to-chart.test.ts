import { describe, expect, it } from "vitest";
import {
  metricsToChartData,
  normalizeChartData,
  parseMetricNumeric,
  resolveChartData,
} from "@/lib/slides/metrics-to-chart";

describe("parseMetricNumeric", () => {
  it("prefers explicit numericValue", () => {
    expect(parseMetricNumeric("n/a", 42)).toBe(42);
  });

  it("parses percents and suffixes", () => {
    expect(parseMetricNumeric("42%")).toBe(42);
    expect(parseMetricNumeric("$1.2k")).toBe(1200);
    expect(parseMetricNumeric("3,400")).toBe(3400);
  });
});

describe("metricsToChartData", () => {
  it("maps labeled metrics into chart points", () => {
    expect(
      metricsToChartData([
        { label: "NPS", value: "72" },
        { label: "Adoption", value: "45%", numericValue: 45 },
        { label: "Bad", value: "n/a" },
      ])
    ).toEqual([
      { name: "NPS", value: 72 },
      { name: "Adoption", value: 45 },
    ]);
  });
});

describe("resolveChartData", () => {
  it("prefers project metrics over AI chartData", () => {
    expect(
      resolveChartData({
        metrics: [{ label: "A", value: "10" }],
        chartData: [{ name: "B", value: 99 }],
      })
    ).toEqual([{ name: "A", value: 10 }]);
  });

  it("falls back to normalizing chartData", () => {
    expect(
      normalizeChartData([
        { label: "Q1", value: "30" },
        { name: "Q2", value: 50 },
      ])
    ).toEqual([
      { name: "Q1", value: 30 },
      { name: "Q2", value: 50 },
    ]);
  });
});
