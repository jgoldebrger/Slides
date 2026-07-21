import { describe, it, expect } from "vitest";
import { generatePptxBuffer } from "@/lib/export/pptx";
import type { Slide } from "@/types/slide";
import { SLIDE_LAYOUTS } from "@/types/slide";

const theme = {
  primaryColor: "#171717",
  accentColor: "#2563eb",
  fontStyle: "sans" as const,
};

function slideForLayout(layout: Slide["layout"]): Slide {
  const base = {
    id: `slide-${layout}`,
    order: 0,
    type: "content",
    layout,
    title: `${layout} slide`,
    content: {} as Slide["content"],
  };

  switch (layout) {
    case "title":
      return { ...base, content: { body: "Subtitle" } };
    case "bullets":
      return { ...base, content: { bullets: ["One", "Two"] } };
    case "metrics_grid":
      return {
        ...base,
        content: {
          metrics: [
            { label: "Velocity", value: "42" },
            { label: "Bugs", value: "3" },
          ],
        },
      };
    case "timeline":
      return { ...base, content: { bullets: ["M1 done", "M2 next"] } };
    case "two_column":
      return { ...base, content: { bullets: ["Left", "Right"], body: "Summary" } };
    case "image_caption":
      return { ...base, content: { body: "Caption text" } };
    case "chart":
      return {
        ...base,
        content: {
          chartData: [
            { name: "A", value: 40 },
            { name: "B", value: 70 },
          ],
        },
      };
    case "quote":
      return { ...base, content: { quote: "Great progress", attribution: "Sponsor" } };
    case "section_break":
      return { ...base, content: { body: "Next section" } };
    default:
      return base;
  }
}

describe("generatePptxBuffer layout mappers", () => {
  for (const layout of SLIDE_LAYOUTS) {
    it(`produces valid PPTX for ${layout}`, async () => {
      const buffer = await generatePptxBuffer(
        [slideForLayout(layout)],
        `Test ${layout}`,
        theme,
        { branded: false, logoUrl: null }
      );
      expect(buffer.length).toBeGreaterThan(500);
      expect(buffer.subarray(0, 2).toString()).toBe("PK");
    });
  }
});
