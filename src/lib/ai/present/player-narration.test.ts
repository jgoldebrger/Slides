import { describe, expect, it, vi } from "vitest";
import { generatePlayerSlideScript } from "@/lib/ai/present/player-narration";
import type { Slide } from "@/types/slide";

const slide: Slide = {
  id: "00000000-0000-4000-8000-000000000001",
  order: 1,
  title: "Q3 Results",
  layout: "bullets",
  type: "content",
  content: { body: "Revenue up 12%." },
};

vi.mock("ai", () => ({
  generateObject: vi.fn().mockRejectedValue(new Error("LLM down")),
}));

describe("generatePlayerSlideScript", () => {
  it("falls back to buildSlideNarration when LLM fails", async () => {
    const script = await generatePlayerSlideScript({
      slide,
      slideIndex: 0,
      slideCount: 3,
      deckName: "Q3 Update",
    });
    expect(script).toContain("Q3 Results");
    expect(script).toContain("Revenue up 12%");
  });
});
