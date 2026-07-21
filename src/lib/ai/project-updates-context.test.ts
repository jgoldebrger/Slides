import { describe, expect, it } from "vitest";
import {
  isProjectUpdatesEmpty,
  isProjectUpdatesSparse,
  normalizeProjectUpdatesForAi,
  projectUpdatesPromptRules,
} from "@/lib/ai/project-updates-context";

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
    expect(rules).toContain("minimal outline");
  });
});
