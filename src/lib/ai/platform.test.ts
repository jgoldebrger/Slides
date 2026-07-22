import { describe, expect, it } from "vitest";
import { estimatePaceScore } from "@/lib/ai/present";
import { explainLayoutChoice } from "@/lib/ai/editor";
import { parseOrgSettings } from "@/lib/ai/org-prefs";

describe("present helpers", () => {
  it("estimates pace from slides", () => {
    const score = estimatePaceScore([
      { title: "Intro", content: { body: "Hello world" }, speaker_notes: "Say hi" },
      { title: "Metrics", content: { body: "Revenue up" } },
    ]);
    expect(score.estimatedMinutes).toBeGreaterThan(0);
  });
});

describe("editor helpers", () => {
  it("explains layout choice", () => {
    const result = explainLayoutChoice("Q2 Revenue", "KPI dashboard", "bullets");
    expect(result.currentLayout).toBe("bullets");
  });
});

describe("org prefs", () => {
  it("parses empty settings", () => {
    expect(parseOrgSettings({}).aiPrefs).toEqual({});
  });
});
