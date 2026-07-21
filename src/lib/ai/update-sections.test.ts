import { describe, expect, it } from "vitest";
import {
  defaultIncludedSectionsForDeckType,
  filterUpdatesBySections,
} from "@/lib/ai/update-sections";

describe("update-sections", () => {
  it("filters updates to included sections only", () => {
    const filtered = filterUpdatesBySections(
      {
        goals: ["Ship v2"],
        metrics: [{ label: "NPS", value: "42" }],
        risks: [{ title: "Delay" }],
      },
      ["goals", "metrics"]
    );
    expect(filtered).toEqual({
      goals: ["Ship v2"],
      metrics: [{ label: "NPS", value: "42" }],
    });
    expect(filtered.risks).toBeUndefined();
  });

  it("defaults executive deck to fewer sections", () => {
    const sections = defaultIncludedSectionsForDeckType("executive_update");
    expect(sections).toContain("progress");
    expect(sections).toContain("metrics");
    expect(sections).not.toContain("goals");
  });
});
