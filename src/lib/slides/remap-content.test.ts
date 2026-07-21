import { describe, expect, it } from "vitest";
import {
  bulletsToMetrics,
  metricsToBullets,
  remapSlideContentForLayout,
} from "./remap-content";

describe("remapSlideContentForLayout", () => {
  it("keeps bullets when switching to timeline", () => {
    const result = remapSlideContentForLayout("bullets", "timeline", {
      bullets: ["Kickoff", "Build", "Launch"],
      body: "Q3 plan",
    });
    expect(result.bullets).toEqual(["Kickoff", "Build", "Launch"]);
    expect(result.body).toBe("Q3 plan");
  });

  it("converts bullets to metrics for metrics_grid", () => {
    const result = remapSlideContentForLayout("bullets", "metrics_grid", {
      bullets: ["NPS: 72", "Revenue | $1.2M", "On track"],
    });
    expect(result.metrics).toEqual([
      { label: "NPS", value: "72" },
      { label: "Revenue", value: "$1.2M" },
      { label: "On track", value: "—" },
    ]);
  });

  it("converts metrics back to bullets", () => {
    const result = remapSlideContentForLayout("metrics_grid", "bullets", {
      metrics: [
        { label: "NPS", value: "72" },
        { label: "Revenue", value: "$1.2M" },
      ],
    });
    expect(result.bullets).toEqual(["NPS: 72", "Revenue: $1.2M"]);
  });

  it("maps bullets into quote text", () => {
    const result = remapSlideContentForLayout("bullets", "quote", {
      bullets: ["Customers love the rollout"],
      body: "ignored when bullets exist as primary for quote prefer body first",
    });
    // body wins over bullets for quote when both exist
    expect(result.quote).toBe(
      "ignored when bullets exist as primary for quote prefer body first"
    );
  });

  it("prefers existing quote when switching to quote", () => {
    const result = remapSlideContentForLayout("title", "quote", {
      quote: "Ship it",
      body: "subtitle",
    });
    expect(result.quote).toBe("Ship it");
  });

  it("preserves image and background fields", () => {
    const result = remapSlideContentForLayout("bullets", "metrics_grid", {
      bullets: ["A: 1"],
      imageUrl: "https://example.com/a.png",
      imagePath: "org/a.png",
      backgroundImagePath: "org/bg.png",
    });
    expect(result.imageUrl).toBe("https://example.com/a.png");
    expect(result.imagePath).toBe("org/a.png");
    expect(result.backgroundImagePath).toBe("org/bg.png");
    expect(result.metrics?.[0]).toEqual({ label: "A", value: "1" });
  });

  it("builds chartData from metrics", () => {
    const result = remapSlideContentForLayout("metrics_grid", "chart", {
      metrics: [
        { label: "Done", value: "42%" },
        { label: "Left", value: "58%" },
      ],
    });
    expect(result.chartData).toEqual([
      { name: "Done", value: 42 },
      { name: "Left", value: 58 },
    ]);
  });
});

describe("bulletsToMetrics / metricsToBullets", () => {
  it("round-trips simple metrics", () => {
    const metrics = bulletsToMetrics(["Alpha: 10", "Beta | 20"]);
    expect(metricsToBullets(metrics)).toEqual(["Alpha: 10", "Beta: 20"]);
  });
});
