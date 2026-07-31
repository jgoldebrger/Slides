import { describe, expect, it } from "vitest";
import { extractUpdateFacts, factsByIds } from "@/lib/ai/update-facts";

describe("extractUpdateFacts", () => {
  it("assigns stable IDs per section index", () => {
    const facts = extractUpdateFacts({
      goals: ["Ship v2", "Improve NPS"],
      metrics: [{ label: "Revenue", value: "$1.2M", trend: "up" }],
      progress: "Rolled out to all regions.",
    });

    expect(facts.map((f) => f.id)).toEqual([
      "goal:0",
      "goal:1",
      "metric:0",
      "progress:0",
    ]);
  });

  it("returns facts for requested IDs only", () => {
    const facts = extractUpdateFacts({
      milestones: [{ title: "Launch", date: "Q3" }],
      risks: [{ title: "Vendor delay", severity: "medium" }],
    });
    const picked = factsByIds(facts, ["milestone:0"]);
    expect(picked).toHaveLength(1);
    expect(picked[0]?.label).toContain("Launch");
  });
});
