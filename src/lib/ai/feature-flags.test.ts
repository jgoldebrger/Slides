import { describe, expect, it } from "vitest";
import { isAiFeatureEnabled, enabledAiFeatures } from "@/lib/ai/feature-flags";
import { parseCitations } from "@/lib/ai/citations";
import { inferConfidenceFromCitations } from "@/lib/ai/confidence";
import { checkHitlForGeneratedContent } from "@/lib/ai/hitl";

describe("feature-flags", () => {
  it("enables trust features by default", () => {
    expect(isAiFeatureEnabled("trust_activity_timeline")).toBe(true);
  });

  it("respects org overrides", () => {
    expect(
      isAiFeatureEnabled("intake_slack", { intake_slack: false })
    ).toBe(false);
  });

  it("lists enabled features", () => {
    expect(enabledAiFeatures().length).toBeGreaterThan(10);
  });
});

describe("citations", () => {
  it("parses citation bundles", () => {
    const citations = parseCitations({
      citations: [{ field: "metrics", excerpt: "NPS 42" }],
    });
    expect(citations).toHaveLength(1);
  });
});

describe("confidence", () => {
  it("infers high confidence when most claims cited", () => {
    const meta = inferConfidenceFromCitations(4, 5);
    expect(meta.level).toBe("high");
  });
});

describe("hitl", () => {
  it("blocks new metrics when required", () => {
    const result = checkHitlForGeneratedContent(
      { requireHitlForNewMetrics: true },
      { metrics: [{ label: "ARR", value: "1M" }] },
      {}
    );
    expect(result.allowed).toBe(false);
  });
});
