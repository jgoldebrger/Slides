import { describe, expect, it } from "vitest";
import { audiencePromptHint, normalizeDeckAudience } from "@/lib/ai/audience";

describe("normalizeDeckAudience", () => {
  it("returns general for unknown values", () => {
    expect(normalizeDeckAudience("invalid")).toBe("general");
  });

  it("accepts board audience", () => {
    expect(normalizeDeckAudience("board")).toBe("board");
  });
});

describe("audiencePromptHint", () => {
  it("includes client-safe guidance for client audience", () => {
    expect(audiencePromptHint("client")).toMatch(/external customers/i);
  });
});
