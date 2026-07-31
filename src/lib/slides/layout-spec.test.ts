import { describe, expect, it } from "vitest";
import {
  countContentSignals,
  pickDensity,
} from "@/lib/slides/layout-spec";
import type { Slide } from "@/types/slide";

function bulletsSlide(count: number): Slide {
  return {
    id: "1",
    order: 0,
    type: "content",
    layout: "bullets",
    title: "Progress",
    content: {
      bullets: Array.from({ length: count }, (_, i) => `Item ${i + 1}`),
    },
  };
}

describe("pickDensity", () => {
  it("When bullets layout has 2 items, should pick airy", () => {
    const signals = countContentSignals(bulletsSlide(2));
    expect(pickDensity("bullets", signals)).toBe("airy");
  });

  it("When bullets layout has 4 items, should pick comfort", () => {
    const signals = countContentSignals(bulletsSlide(4));
    expect(pickDensity("bullets", signals)).toBe("comfort");
  });

  it("When bullets layout has 6 items, should pick compact", () => {
    const signals = countContentSignals(bulletsSlide(6));
    expect(pickDensity("bullets", signals)).toBe("compact");
  });

  it("When title layout, should always pick airy", () => {
    const signals = countContentSignals({
      id: "t",
      order: 0,
      type: "title",
      layout: "title",
      title: "Cover",
      content: { body: "Subtitle" },
    });
    expect(pickDensity("title", signals)).toBe("airy");
  });

  it("When section_break layout, should always pick airy", () => {
    const signals = countContentSignals({
      id: "s",
      order: 0,
      type: "section",
      layout: "section_break",
      title: "Section",
      content: {},
    });
    expect(pickDensity("section_break", signals)).toBe("airy");
  });
});

describe("countContentSignals", () => {
  it("When body has rich text, should count plain-text length", () => {
    const slide: Slide = {
      id: "1",
      order: 0,
      type: "content",
      layout: "bullets",
      title: "T",
      content: { body: "<p><strong>Hello</strong> world</p>" },
    };
    const signals = countContentSignals(slide);
    expect(signals.bodyLength).toBe("Hello world".length);
  });
});
