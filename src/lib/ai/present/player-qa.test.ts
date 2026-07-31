import { describe, expect, it, vi } from "vitest";
import { answerPlayerQuestion } from "@/lib/ai/present/player-qa";

vi.mock("@/lib/ai/present/index", () => ({
  liveQaFromDeck: vi.fn(),
}));

import { liveQaFromDeck } from "@/lib/ai/present/index";

describe("answerPlayerQuestion", () => {
  it("returns answered when grounded with citations", async () => {
    vi.mocked(liveQaFromDeck).mockResolvedValue({
      answer: "Revenue grew 12%.",
      grounded: true,
      citations: [{ field: "metrics", excerpt: "Revenue up 12%" }],
    });
    const result = await answerPlayerQuestion({
      question: "How is revenue?",
      slides: [{ title: "Metrics", content: {} }],
      updates: {},
    });
    expect(result.type).toBe("answered");
    if (result.type === "answered") {
      expect(result.citations).toHaveLength(1);
    }
  });

  it("returns deferred when not grounded", async () => {
    vi.mocked(liveQaFromDeck).mockResolvedValue({
      answer: "Maybe 20%",
      grounded: false,
      citations: [],
    });
    const result = await answerPlayerQuestion({
      question: "Future forecast?",
      slides: [{ title: "Metrics", content: {} }],
      updates: {},
    });
    expect(result.type).toBe("deferred");
    expect(result.spokenReply).toContain("don't have that information");
  });
});
