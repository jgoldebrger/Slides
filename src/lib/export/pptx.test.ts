import { describe, it, expect } from "vitest";
import { generatePptxBuffer } from "@/lib/export/pptx";
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
});
