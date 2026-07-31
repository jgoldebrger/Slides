import { describe, expect, it } from "vitest";
import { analyzeProjectUpdates } from "@/lib/ai/analyze-project-updates";
import { buildSlideContentPlanPrompt } from "@/lib/ai/prompts/slide-content-plan";
import { extractUpdateFacts } from "@/lib/ai/update-facts";
import { validateSlideContentPlan } from "@/lib/ai/slide-content-plan";

describe("validateSlideContentPlan", () => {
  it("rejects duplicate fact assignments", () => {
    const result = validateSlideContentPlan(
      {
        entries: [
          {
            slideIndex: 0,
            factIds: ["metric:0"],
            role: "content",
            focus: "Revenue",
          },
          {
            slideIndex: 1,
            factIds: ["metric:0"],
            role: "content",
            focus: "Dup",
          },
        ],
      },
      ["metric:0"]
    );
    expect(result.ok).toBe(false);
  });

  it("allows recap slides with no facts", () => {
    const result = validateSlideContentPlan(
      {
        entries: [
          {
            slideIndex: 0,
            factIds: ["goal:0"],
            role: "content",
            focus: "Goals",
          },
          {
            slideIndex: 1,
            factIds: [],
            role: "recap",
            focus: "Summary",
          },
        ],
      },
      ["goal:0"]
    );
    expect(result).toEqual({ ok: true });
  });
});

describe("buildSlideContentPlanPrompt", () => {
  it("includes fact IDs in planning prompt", () => {
    const updates = {
      metrics: [{ label: "Revenue", value: "$1.2M", trend: "up" as const }],
    };
    const facts = extractUpdateFacts(updates);
    const prompt = buildSlideContentPlanPrompt({
      outline: {
        deckType: "project_status",
        slides: [
          {
            title: "Revenue",
            layout: "metrics_grid",
            type: "content",
            summary: "Q3 revenue performance",
          },
        ],
      },
      facts,
      contentAnalysis: analyzeProjectUpdates(updates),
    });

    expect(prompt).toContain("metric:0");
    expect(prompt).toContain("exactly ONE");
  });
});
