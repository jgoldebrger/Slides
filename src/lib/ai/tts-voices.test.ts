import { describe, expect, it } from "vitest";
import {
  clampTtsSpeed,
  normalizeAiTtsVoice,
  truncateForTts,
} from "./tts-voices";

describe("tts voices", () => {
  it("normalizes unknown voices to nova", () => {
    expect(normalizeAiTtsVoice("nope")).toBe("nova");
    expect(normalizeAiTtsVoice("onyx")).toBe("onyx");
  });

  it("clamps speed to OpenAI range", () => {
    expect(clampTtsSpeed(0.1)).toBe(0.25);
    expect(clampTtsSpeed(5)).toBe(4);
    expect(clampTtsSpeed(1.25)).toBe(1.25);
  });

  it("truncates long narration text", () => {
    const long = "a".repeat(5000);
    expect(truncateForTts(long).length).toBeLessThanOrEqual(4096);
    expect(truncateForTts(long).endsWith("…")).toBe(true);
  });
});
