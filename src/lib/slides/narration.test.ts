import { describe, expect, it } from "vitest";
import { buildSlideNarration } from "./narration";
import type { Slide } from "@/types/slide";

const base: Slide = {
  id: "1",
  order: 0,
  type: "content",
  layout: "bullets",
  title: "Status",
  content: {},
};

describe("buildSlideNarration", () => {
  it("joins title, body, and bullets", () => {
    const text = buildSlideNarration({
      ...base,
      content: { body: "On track", bullets: ["Ship A", "Ship B"] },
    });
    expect(text).toContain("Status");
    expect(text).toContain("On track");
    expect(text).toContain("Ship A");
  });

  it("includes metrics", () => {
    const text = buildSlideNarration({
      ...base,
      content: { metrics: [{ label: "NPS", value: "72" }] },
    });
    expect(text).toContain("NPS: 72");
  });
});
