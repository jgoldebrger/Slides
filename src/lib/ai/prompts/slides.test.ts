import { describe, expect, it } from "vitest";
import { buildSlideFillPrompt } from "@/lib/ai/prompts/slides";

describe("buildSlideFillPrompt", () => {
  const base = {
    deckType: "project_status" as const,
    projectName: "Apollo",
    updates: { goals: ["Ship v2"] },
    outlineSlide: {
      title: "Delivery",
      type: "content" as const,
      layout: "bullets" as const,
      summary: "What we shipped",
    },
    slideIndex: 1,
    totalSlides: 3,
  };

  it("includes scoped facts and already covered when provided", () => {
    const prompt = buildSlideFillPrompt({
      ...base,
      scopedFacts: [
        {
          id: "completed:0",
          section: "completed_work",
          label: "API v2",
          payload: "API v2",
        },
      ],
      alreadyCovered: [{ title: "Overview", summary: "High-level goals" }],
    });
    expect(prompt).toContain("completed:0");
    expect(prompt).toContain("Already covered");
    expect(prompt).not.toContain("Project data (JSON)");
  });

  it("requires additive speaker notes", () => {
    const prompt = buildSlideFillPrompt({ ...base, scopedFacts: [] });
    expect(prompt).toMatch(/Do NOT copy or paraphrase bullet/i);
    expect(prompt).toMatch(/transition/i);
  });
});
