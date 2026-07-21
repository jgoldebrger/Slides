import { describe, expect, it } from "vitest";
import { buildRefreshDiff } from "@/lib/slides/refresh-diff";

describe("buildRefreshDiff", () => {
  it("detects title and content changes per slide", () => {
    const diff = buildRefreshDiff({
      revisionId: "rev-1",
      revision: 2,
      refreshedAt: "2026-01-01T00:00:00Z",
      beforeSlides: [
        {
          order: 0,
          type: "content",
          layout: "bullets",
          title: "Old title",
          content: { bullets: ["A"] },
          speaker_notes: null,
          metadata: {},
        },
      ],
      afterSlides: [
        {
          id: "slide-1",
          order: 0,
          title: "New title",
          content: { bullets: ["B"] },
          speaker_notes: null,
        },
      ],
    });

    expect(diff.changedCount).toBe(1);
    expect(diff.slides[0]?.changed).toBe(true);
    expect(diff.slides[0]?.changes.map((c) => c.field)).toContain("title");
    expect(diff.slides[0]?.changes.map((c) => c.field)).toContain("content");
  });

  it("reports no changes when content matches", () => {
    const diff = buildRefreshDiff({
      revisionId: "rev-1",
      revision: 1,
      refreshedAt: "2026-01-01T00:00:00Z",
      beforeSlides: [
        {
          order: 0,
          type: "content",
          layout: "bullets",
          title: "Same",
          content: { bullets: ["A"] },
          speaker_notes: "note",
          metadata: {},
        },
      ],
      afterSlides: [
        {
          id: "slide-1",
          order: 0,
          title: "Same",
          content: { bullets: ["A"] },
          speaker_notes: "note",
        },
      ],
    });

    expect(diff.changedCount).toBe(0);
  });
});
