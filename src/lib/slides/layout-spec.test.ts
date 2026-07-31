import { describe, expect, it } from "vitest";
import {
  buildLayoutComposition,
  countContentSignals,
  inToPx,
  pickDensity,
  ptToPx,
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

describe("buildLayoutComposition", () => {
  it("When airy bullets and branded, contentY should be greater than unbranded", () => {
    const branded = buildLayoutComposition("bullets", "airy", { branded: true });
    const neutral = buildLayoutComposition("bullets", "airy", { branded: false });
    expect(branded.contentYIn).toBeGreaterThan(neutral.contentYIn);
  });

  it("When compact density, body font should be smaller than airy", () => {
    const compact = buildLayoutComposition("bullets", "compact");
    const airy = buildLayoutComposition("bullets", "airy");
    expect(compact.typography.bodyPt).toBeLessThan(airy.typography.bodyPt);
  });

  it("When airy metrics_grid, should use 2 columns", () => {
    const comp = buildLayoutComposition("metrics_grid", "airy");
    expect(comp.metricsCols).toBe(2);
  });

  it("When compact metrics_grid, should use 3 columns", () => {
    const comp = buildLayoutComposition("metrics_grid", "compact");
    expect(comp.metricsCols).toBe(3);
  });
});

describe("unit converters", () => {
  it("When converting 1 inch at reference width, should equal 96px", () => {
    expect(inToPx(1)).toBe(96);
  });

  it("When converting 12pt, should equal 16px", () => {
    expect(ptToPx(12)).toBe(16);
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
