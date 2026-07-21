import { describe, it, expect } from "vitest";
import { slideFillSchemaForLayout } from "@/lib/ai/slide-content-schema";
import { SLIDE_LAYOUTS } from "@/types/slide";

describe("slideFillSchemaForLayout", () => {
  it("validates bullets layout content", () => {
    const schema = slideFillSchemaForLayout("bullets");
    const result = schema.safeParse({
      title: "Progress update",
      speakerNotes: "Highlight shipped work.",
      content: {
        bullets: ["Shipped feature A", "Fixed critical bugs"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates metrics_grid layout content", () => {
    const schema = slideFillSchemaForLayout("metrics_grid");
    const result = schema.safeParse({
      title: "Key metrics",
      speakerNotes: "",
      content: {
        metrics: [
          { label: "Velocity", value: "42 pts", trend: "up" },
          { label: "Open bugs", value: "3", trend: "down" },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates quote layout content", () => {
    const schema = slideFillSchemaForLayout("quote");
    const result = schema.safeParse({
      title: "Stakeholder feedback",
      speakerNotes: "",
      content: {
        quote: "The team delivered ahead of schedule.",
        attribution: "Program sponsor",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty bullets", () => {
    const schema = slideFillSchemaForLayout("bullets");
    const result = schema.safeParse({
      title: "Empty",
      speakerNotes: "",
      content: { bullets: [] },
    });
    expect(result.success).toBe(false);
  });

  it("has a schema for every slide layout", () => {
    for (const layout of SLIDE_LAYOUTS) {
      const schema = slideFillSchemaForLayout(layout);
      expect(schema).toBeDefined();
    }
  });
});
