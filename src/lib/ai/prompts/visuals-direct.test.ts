import { describe, expect, it } from "vitest";
import {
  buildAnnotatePolishDirectPrompt,
  buildAnnotatePolishEditPrompt,
} from "@/lib/ai/prompts/visuals";

describe("buildAnnotatePolishEditPrompt", () => {
  it("prioritizes user instructions and forbids abstract backgrounds", () => {
    const prompt = buildAnnotatePolishEditPrompt({
      slideTitle: "Rollout",
      slideContext: "ADC milestone",
      userInstructions: "remove that screen",
      keepAnnotations: false,
    });
    expect(prompt).toMatch(/remove that screen/i);
    expect(prompt).toMatch(/USER REQUEST/i);
    expect(prompt).toMatch(/abstract gradient/i);
    expect(prompt).toMatch(/in place/i);
  });
});

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
