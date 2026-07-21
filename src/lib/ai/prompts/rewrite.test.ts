import { describe, expect, it } from "vitest";
import { buildRewriteSlidePrompt } from "@/lib/ai/prompts/rewrite";

describe("buildRewriteSlidePrompt", () => {
  it("includes user instructions when provided", () => {
    const prompt = buildRewriteSlidePrompt({
      layout: "bullets",
      title: "Q3 progress",
      content: { bullets: ["Shipped v2"] },
      instructions: "Make this shorter and more executive.",
    });

    expect(prompt).toMatch(/Make this shorter and more executive/i);
    expect(prompt).toMatch(/User rewrite instructions/i);
  });

  it("omits instruction block when instructions are absent", () => {
    const prompt = buildRewriteSlidePrompt({
      layout: "bullets",
      title: "Q3 progress",
      content: { bullets: ["Shipped v2"] },
    });

    expect(prompt).not.toMatch(/User rewrite instructions/i);
  });
});
