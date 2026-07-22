import { describe, expect, it } from "vitest";
import {
  isProjectUpdatesEmpty,
  isProjectUpdatesSparse,
  normalizeProjectUpdatesForAi,
  projectUpdatesPromptRules,
  defaultIncludedSectionsForProject,
} from "@/lib/ai/project-updates-context";
import { PROJECT_UPDATE_SECTION_IDS } from "@/lib/ai/update-sections";

describe("project-updates-context", () => {
  it("normalizes empty arrays away", () => {
    expect(
      normalizeProjectUpdatesForAi({
        goals: [],
        progress: "",
        metrics: [{ label: "NPS", value: "42" }],
        project_id: "x",
      })
    ).toEqual({
      metrics: [{ label: "NPS", value: "42" }],
    });
  });

  it("detects sparse and empty updates", () => {
    expect(isProjectUpdatesEmpty({})).toBe(true);
    expect(isProjectUpdatesSparse({ progress: "Shipped v1" })).toBe(true);
  });

  it("forbids placeholder language in prompt rules", () => {
    const rules = projectUpdatesPromptRules({});
    expect(rules).toContain("not provided");
    expect(rules).not.toContain("minimal outline");
    expect(rules).not.toContain("Prefer slides from");
  });

  it("scopes included sections without slide templates", () => {
    const rules = projectUpdatesPromptRules(
      { progress: "On track" },
      { includedSections: ["progress", "metrics"] }
    );
    expect(rules).toContain("Facts available for this deck are limited to");
    expect(rules).not.toContain("title slide");
  });

  it("defaults to all sections when project has no data", () => {
    expect(defaultIncludedSectionsForProject({})).toEqual(
      PROJECT_UPDATE_SECTION_IDS
    );
  });
});
