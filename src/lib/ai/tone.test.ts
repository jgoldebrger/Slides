import { describe, expect, it } from "vitest";
import {
  aiTonePromptHint,
  isAiTone,
  normalizeAiTone,
} from "./tone";

describe("ai tone", () => {
  it("normalizes unknown values to executive", () => {
    expect(normalizeAiTone(undefined)).toBe("executive");
    expect(normalizeAiTone("nope")).toBe("executive");
    expect(normalizeAiTone("concise")).toBe("concise");
  });

  it("validates tone ids", () => {
    expect(isAiTone("formal")).toBe(true);
    expect(isAiTone("loud")).toBe(false);
  });

  it("returns a non-empty prompt hint", () => {
    expect(aiTonePromptHint("executive").length).toBeGreaterThan(20);
    expect(aiTonePromptHint("optimistic")).toMatch(/factual/i);
  });
});
