import { describe, expect, it } from "vitest";
import {
  BRANDED_ACCENT_BAR,
  buildLayoutComposition,
  compositionToPreviewStyles,
  inToPx,
  inToPy,
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

  it("When unknown layout, should fall back to bullets composition", () => {
    const slide: Slide = {
      id: "1",
      order: 0,
      type: "content",
      layout: "not_a_layout" as Slide["layout"],
      title: "T",
      content: { bullets: ["a"] },
    };
    const comp = resolveLayoutComposition(slide);
    expect(comp.layout).toBe("bullets");
  });
});

describe("isExtremeVolume", () => {
  it("When 6 bullets compact, should not flag extreme", () => {
    const slide: Slide = {
      id: "1",
      order: 0,
      type: "content",
      layout: "bullets",
      title: "T",
      content: { bullets: ["1", "2", "3", "4", "5", "6"] },
    };
    const comp = resolveLayoutComposition(slide);
    expect(comp.density).toBe("compact");
    expect(comp.contentOverflow).toBe("visible");
  });

  it("When 9 bullets compact, should enable overflow", () => {
    const slide: Slide = {
      id: "1",
      order: 0,
      type: "content",
      layout: "bullets",
      title: "T",
      content: {
        bullets: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
      },
    };
    const comp = resolveLayoutComposition(slide);
    expect(comp.contentOverflow).toBe("auto");
  });
});

describe("preview vs pptx parity", () => {
  it("When airy branded bullets, contentTopPx should match inToPy(contentYIn)", () => {
    const comp = buildLayoutComposition("bullets", "airy", { branded: true });
    const styles = compositionToPreviewStyles(comp);
    expect(styles.contentTopPx).toBeCloseTo(inToPy(comp.contentYIn), 1);
  });

  it("When comfort density, title pt should match title preview font size", () => {
    const comp = buildLayoutComposition("bullets", "comfort");
    const styles = compositionToPreviewStyles(comp);
    expect(styles.titleStyle.fontSize).toBe(
      `${ptToPx(comp.typography.titlePt)}px`
    );
  });

  it("When branded accent bar, preview px should match PPTX inch constants", () => {
    const comp = buildLayoutComposition("bullets", "comfort", { branded: true });
    const styles = compositionToPreviewStyles(comp);
    expect(styles.accentBarTopPx).toBeCloseTo(inToPy(BRANDED_ACCENT_BAR.yIn), 1);
    expect(styles.accentBarWidthPx).toBeCloseTo(inToPx(BRANDED_ACCENT_BAR.widthIn), 1);
    expect(styles.accentBarHeightPx).toBeCloseTo(
      inToPy(BRANDED_ACCENT_BAR.heightIn),
      1
    );
  });

  it("When comfort bullets, title band height should match composition", () => {
    const comp = buildLayoutComposition("bullets", "comfort");
    const styles = compositionToPreviewStyles(comp);
    expect(styles.titleTopPx).toBeCloseTo(inToPy(comp.titleYIn), 1);
    expect(styles.titleHeightPx).toBeCloseTo(inToPy(comp.titleHeightIn), 1);
  });
});
