import { describe, expect, it } from "vitest";
import { buildAnnotatePolishMetaPrompt } from "@/lib/ai/prompts/visuals";
import { normalizeRect } from "@/lib/slides/image-annotator";

describe("buildAnnotatePolishMetaPrompt", () => {
  it("asks AI to use marks as guidance when not keeping annotations", () => {
    const prompt = buildAnnotatePolishMetaPrompt({
      slideTitle: "Q3 update",
      slideContext: "Revenue up 12%",
      keepAnnotations: false,
    });
    expect(prompt).toMatch(/GUIDANCE ONLY/i);
    expect(prompt).not.toMatch(/Preserve that markup EXACTLY/i);
  });

  it("asks AI to preserve markup when keepAnnotations is true", () => {
    const prompt = buildAnnotatePolishMetaPrompt({
      slideTitle: "Q3 update",
      slideContext: "Revenue up 12%",
      keepAnnotations: true,
      brandColors: { primary: "#111111", accent: "#eeeeee" },
    });
    expect(prompt).toMatch(/Preserve that markup EXACTLY/i);
    expect(prompt).toMatch(/#111111/);
  });
});

describe("normalizeRect", () => {
  it("normalizes drag coordinates", () => {
    expect(normalizeRect(10, 20, 50, 80)).toEqual({ x: 10, y: 20, w: 40, h: 60 });
    expect(normalizeRect(50, 80, 10, 20)).toEqual({ x: 10, y: 20, w: 40, h: 60 });
  });
});
