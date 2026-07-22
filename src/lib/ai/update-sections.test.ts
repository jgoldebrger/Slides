import { describe, expect, it } from "vitest";
import {
  defaultIncludedSectionsForDeckType,
  filterUpdatesBySections,
  includedSectionsPromptRules,
} from "@/lib/ai/update-sections";
import {
  defaultIncludedSectionsForProject,
  sectionsWithData,
} from "@/lib/ai/project-updates-context";

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

  it("includedSectionsPromptRules scopes facts without mapping to slides", () => {
    const rules = includedSectionsPromptRules(["metrics", "progress"]);
    expect(rules).toContain("Facts available for this deck are limited to");
    expect(rules).toContain("Do NOT create one slide per field");
  });

  it("sectionsWithData returns only filled sections", () => {
    const ids = sectionsWithData({
      goals: ["Ship v2"],
      metrics: [],
      progress: "On track",
    });
    expect(ids).toContain("goals");
    expect(ids).toContain("progress");
    expect(ids).not.toContain("metrics");
  });

  it("defaultIncludedSectionsForProject prefers sections with data", () => {
    const sections = defaultIncludedSectionsForProject({
      risks: [{ title: "Delay" }],
      metrics: [{ label: "NPS", value: "42" }],
    });
    expect(sections).toEqual(["metrics", "risks"]);
  });

  it("defaultIncludedSectionsForProject returns all sections when empty", () => {
    const sections = defaultIncludedSectionsForProject({});
    expect(sections.length).toBe(9);
  });
});
