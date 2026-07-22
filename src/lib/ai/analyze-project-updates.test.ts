import { describe, expect, it } from "vitest";
import {
  analyzeProjectUpdates,
  contentAnalysisPromptBlock,
} from "@/lib/ai/analyze-project-updates";

describe("analyzeProjectUpdates", () => {
  it("returns empty density and zero slide range when no content", () => {
    const analysis = analyzeProjectUpdates({});
    expect(analysis.density).toBe("empty");
    expect(analysis.slideCountMin).toBe(0);
    expect(analysis.slideCountMax).toBe(0);
    expect(analysis.totalItems).toBe(0);
    expect(analysis.contentDigest).toContain("No substantive");
  });

  it("builds digest from metrics, progress, and risks", () => {
    const analysis = analyzeProjectUpdates({
      progress: "Shipped v2 to production with strong adoption.",
      metrics: [
        { label: "Revenue", value: "$1.2M", trend: "up" },
        { label: "NPS", value: "42" },
      ],
      risks: [{ title: "Vendor delay", severity: "medium" }],
    });

    expect(analysis.contentDigest).toContain("narrative progress");
    expect(analysis.contentDigest).toContain("2 metrics");
    expect(analysis.contentDigest).toContain("1 risks");
    expect(analysis.totalItems).toBeGreaterThan(0);
    expect(analysis.density).not.toBe("empty");
  });

  it("recommends thin range for sparse content", () => {
    const analysis = analyzeProjectUpdates({
      goals: ["Launch beta"],
      progress: "On track.",
    });
    expect(analysis.density).toBe("thin");
    expect(analysis.slideCountMin).toBe(3);
    expect(analysis.slideCountMax).toBe(5);
  });

  it("recommends rich range for dense content", () => {
    const analysis = analyzeProjectUpdates({
      goals: ["A", "B", "C"],
      progress: "Long narrative about the quarter.",
      completed_work: ["Item 1", "Item 2", "Item 3", "Item 4"],
      current_tasks: [
        { title: "Task 1" },
        { title: "Task 2" },
        { title: "Task 3" },
      ],
      milestones: [{ title: "M1" }, { title: "M2" }],
      metrics: [
        { label: "M1", value: "1" },
        { label: "M2", value: "2" },
        { label: "M3", value: "3" },
      ],
      risks: [{ title: "R1" }],
      blockers: ["B1"],
      next_steps: ["N1", "N2"],
    });
    expect(analysis.density).toBe("rich");
    expect(analysis.slideCountMin).toBe(7);
    expect(analysis.slideCountMax).toBe(12);
  });

  it("includes layout hints for metrics", () => {
    const analysis = analyzeProjectUpdates({
      metrics: [
        { label: "Revenue", value: "$1M" },
        { label: "NPS", value: "42" },
      ],
    });
    expect(analysis.contentDigest).toContain("Layout hints");
    expect(analysis.contentDigest).toContain("metrics_grid");
  });
});

describe("contentAnalysisPromptBlock", () => {
  it("includes digest and slide count range", () => {
    const analysis = analyzeProjectUpdates({
      metrics: [{ label: "ARR", value: "$2M" }],
    });
    const block = contentAnalysisPromptBlock(analysis);
    expect(block).toContain("Content analysis");
    expect(block).toContain(analysis.contentDigest);
    expect(block).toMatch(/\d+–\d+ slides/);
  });
});
