import { describe, expect, it } from "vitest";
import { estimatePaceScore } from "@/lib/ai/present";
import { explainLayoutChoice } from "@/lib/ai/editor";
import { parseOrgSettings, parseNaturalLanguageAiPrefs } from "@/lib/ai/org-prefs";

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

  it("falls back to keyword inference without OpenAI", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const prefs = await parseNaturalLanguageAiPrefs(
      "Make it always very clear and fewer slides, adding visuals"
    );
    if (prev) process.env.OPENAI_API_KEY = prev;
    expect(prefs.naturalLanguageNotes).toContain("fewer slides");
    expect(prefs.defaultBrevity).toBe("concise");
    expect(prefs.preferChartsOverTables).toBe(true);
  });
});
