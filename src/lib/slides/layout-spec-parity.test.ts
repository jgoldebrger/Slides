import { describe, expect, it } from "vitest";
import {
  buildLayoutComposition,
  compositionToPreviewStyles,
  inToPx,
  ptToPx,
  resolveLayoutComposition,
} from "@/lib/slides/layout-spec";
import type { Slide } from "@/types/slide";

describe("resolveLayoutComposition", () => {
  it("When 6 bullets, should resolve compact density", () => {
    const slide: Slide = {
      id: "1",
      order: 0,
      type: "content",
      layout: "bullets",
      title: "Many items",
      content: {
        bullets: ["a", "b", "c", "d", "e", "f"],
      },
    };
    const comp = resolveLayoutComposition(slide);
    expect(comp.density).toBe("compact");
  });
});

describe("preview vs pptx parity", () => {
  it("When airy branded bullets, contentY px should match inch conversion", () => {
    const comp = buildLayoutComposition("bullets", "airy", { branded: true });
    expect(inToPx(comp.contentYIn)).toBeCloseTo(comp.contentYIn * 96, 5);
  });

  it("When comfort density, title pt should match title preview font size", () => {
    const comp = buildLayoutComposition("bullets", "comfort");
    const styles = compositionToPreviewStyles(comp);
    expect(styles.titleStyle.fontSize).toBe(
      `${ptToPx(comp.typography.titlePt)}px`
    );
  });
});
