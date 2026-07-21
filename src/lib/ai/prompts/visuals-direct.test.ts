import { describe, expect, it } from "vitest";
import { buildAnnotatePolishDirectPrompt } from "@/lib/ai/prompts/visuals";

describe("buildAnnotatePolishDirectPrompt", () => {
  it("includes user instructions and keep-annotations hint", () => {
    const prompt = buildAnnotatePolishDirectPrompt({
      slideTitle: "Rollout",
      slideContext: "ADC milestone",
      userInstructions: "remove that screen",
      keepAnnotations: false,
    });
    expect(prompt).toMatch(/remove that screen/i);
    expect(prompt).toMatch(/guidance only/i);
  });
});
