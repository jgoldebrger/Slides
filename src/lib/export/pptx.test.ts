import { describe, it, expect } from "vitest";
import { generatePptxBuffer } from "@/lib/export/pptx";
import { resolveLayoutComposition } from "@/lib/slides/layout-spec";
import type { Slide } from "@/types/slide";

describe("generatePptxBuffer", () => {
  it("produces a non-empty buffer", async () => {
    const slides: Slide[] = [
      {
        id: "1",
        order: 0,
        type: "title",
        layout: "title",
        title: "Project Update",
        content: { body: "Q3 status" },
      },
      {
        id: "2",
        order: 1,
        type: "content",
        layout: "bullets",
        title: "Progress",
        content: { bullets: ["Shipped feature A", "Fixed bugs"] },
      },
    ];

    const buffer = await generatePptxBuffer(
      slides,
      "Test Deck",
      {
        primaryColor: "#171717",
        accentColor: "#2563eb",
        fontStyle: "sans",
      },
      { branded: true, logoUrl: null }
    );

    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  });

  it("When compact bullets deck exported, should still produce valid pptx", async () => {
    const slides: Slide[] = [
      {
        id: "1",
        order: 0,
        type: "content",
        layout: "bullets",
        title: "Updates",
        content: {
          bullets: ["a", "b", "c", "d", "e", "f"],
        },
      },
    ];
    const buffer = await generatePptxBuffer(slides, "Compact", {
      primaryColor: "#171717",
      accentColor: "#2563eb",
      fontStyle: "sans",
    });
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  });

  it("When compact bullets slide, composition should drive bullet typography", () => {
    const slide: Slide = {
      id: "1",
      order: 0,
      type: "content",
      layout: "bullets",
      title: "Updates",
      content: {
        bullets: ["a", "b", "c", "d", "e", "f"],
      },
    };
    const comp = resolveLayoutComposition(slide);
    expect(comp.density).toBe("compact");
    expect(comp.typography.bulletPt).toBe(13);
    expect(comp.contentYIn).toBeCloseTo(1.35, 2);
  });
});
