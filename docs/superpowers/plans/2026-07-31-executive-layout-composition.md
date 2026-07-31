# Executive Layout Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unified slide composition (spacing, hierarchy, density) shared between in-app preview and PPTX export so decks look executive-ready instead of template-y.

**Architecture:** Add `lib/slides/layout-spec.ts` with deterministic density selection and a resolved `LayoutComposition` object. Preview maps composition to CSS; export maps to inches/points. Both renderers consume the same resolver at render time — no DB or fill pipeline changes.

**Tech Stack:** Next.js App Router, TypeScript, Vitest, existing `slide-preview.tsx`, `pptxgenjs` export mappers.

## Global Constraints

- Slide types and layouts must remain defined in `src/types/slide.ts` — do not diverge.
- No new npm dependencies.
- Org-scoped data unchanged; composition is pure derivation from slide content.
- Preview must continue to match export layout semantics.
- No AI composition pass, no editor spacing controls, no DB persistence in v1.
- Rich text: density signals use `richTextToPlainText`; export still uses plain text.

**Spec:** `docs/superpowers/specs/2026-07-31-executive-layout-composition-design.md`

---

## File map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/slides/layout-spec.ts` | Create | Density rules, composition builder, unit converters, resolver |
| `src/lib/slides/layout-spec.test.ts` | Create | Density and composition tests |
| `src/lib/slides/layout-spec-parity.test.ts` | Create | Preview/export unit parity |
| `src/lib/export/layouts/types.ts` | Modify | Add `composition` to `PptxLayoutContext` |
| `src/lib/export/pptx.ts` | Modify | Title band and content area from composition |
| `src/lib/export/layouts/index.ts` | Modify | Mappers use composition metrics |
| `src/components/slides/slide-preview.tsx` | Modify | Consume composition styles |
| `src/components/slides/slide-preview.test.tsx` | Modify | Compact vs airy assertions |
| `src/lib/export/pptx.test.ts` | Modify | Composition-driven export smoke |

---

### Task 1: Density types and `pickDensity`

**Files:**
- Create: `src/lib/slides/layout-spec.ts`
- Create: `src/lib/slides/layout-spec.test.ts`

**Interfaces:**
- Produces:
  - `export type LayoutDensity = "compact" | "comfort" | "airy"`
  - `export type ContentSignals = { bulletCount: number; metricCount: number; timelineCount: number; bodyLength: number; chartPointCount: number }`
  - `export function countContentSignals(slide: Slide): ContentSignals`
  - `export function pickDensity(layout: SlideLayout, signals: ContentSignals): LayoutDensity`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/slides/layout-spec.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/lib/slides/layout-spec.test.ts`  
Expected: FAIL — module not found

- [ ] **Step 3: Implement density helpers**

```ts
// src/lib/slides/layout-spec.ts
import type { Slide, SlideLayout } from "@/types/slide";
import { richTextToPlainText } from "@/lib/slides/rich-text";

export type LayoutDensity = "compact" | "comfort" | "airy";

export type ContentSignals = {
  bulletCount: number;
  metricCount: number;
  timelineCount: number;
  bodyLength: number;
  chartPointCount: number;
};

const ALWAYS_AIRY: SlideLayout[] = ["title", "section_break", "quote"];

function densityFromCount(
  count: number,
  thresholds: { airy: number; comfort: number }
): LayoutDensity {
  if (count <= thresholds.airy) return "airy";
  if (count <= thresholds.comfort) return "comfort";
  return "compact";
}

function densityFromBodyLength(length: number): LayoutDensity {
  if (length <= 80) return "airy";
  if (length <= 200) return "comfort";
  return "compact";
}

export function countContentSignals(slide: Slide): ContentSignals {
  const bullets = slide.content.bullets ?? [];
  const metrics = slide.content.metrics ?? [];
  const chartData = slide.content.chartData ?? [];
  return {
    bulletCount: bullets.length,
    metricCount: metrics.length,
    timelineCount: slide.layout === "timeline" ? bullets.length : 0,
    bodyLength: richTextToPlainText(slide.content.body).length,
    chartPointCount: chartData.length,
  };
}

export function pickDensity(
  layout: SlideLayout,
  signals: ContentSignals
): LayoutDensity {
  if (ALWAYS_AIRY.includes(layout)) return "airy";

  if (layout === "metrics_grid") {
    return densityFromCount(signals.metricCount, { airy: 2, comfort: 4 });
  }
  if (layout === "timeline") {
    return densityFromCount(signals.timelineCount, { airy: 3, comfort: 5 });
  }
  if (layout === "chart") {
    return densityFromCount(signals.chartPointCount, { airy: 3, comfort: 5 });
  }
  if (layout === "two_column") {
    const maxSignal = Math.max(signals.bulletCount, signals.bodyLength);
    if (maxSignal <= 2 || signals.bodyLength <= 80) return "airy";
    if (maxSignal <= 4 || signals.bodyLength <= 200) return "comfort";
    return "compact";
  }
  if (layout === "image_caption") {
    const combined = Math.max(signals.bulletCount, signals.bodyLength);
    if (combined <= 2 || signals.bodyLength <= 80) return "airy";
    if (combined <= 4 || signals.bodyLength <= 200) return "comfort";
    return "compact";
  }

  // bullets and default
  const bulletDensity = densityFromCount(signals.bulletCount, {
    airy: 2,
    comfort: 4,
  });
  if (bulletDensity === "compact") return "compact";
  return densityFromBodyLength(signals.bodyLength) === "compact"
    ? "compact"
    : bulletDensity;
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- --run src/lib/slides/layout-spec.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/slides/layout-spec.ts src/lib/slides/layout-spec.test.ts
git commit -m "Add layout density selection from slide content signals."
```

---

### Task 2: `LayoutComposition` builder and PPTX units

**Files:**
- Modify: `src/lib/slides/layout-spec.ts`
- Modify: `src/lib/slides/layout-spec.test.ts`

**Interfaces:**
- Consumes: `pickDensity`, `countContentSignals`, `LayoutDensity`
- Produces:
  - `export const PPTX_SLIDE_WIDTH_IN = 10`
  - `export const PPTX_SLIDE_HEIGHT_IN = 5.625`
  - `export const PREVIEW_REF_WIDTH_PX = 960`
  - `export type LayoutTypography = { titlePt: number; bodyPt: number; bulletPt: number; metricValuePt: number; metricLabelPt: number; captionPt: number }`
  - `export type LayoutComposition = { layout: SlideLayout; density: LayoutDensity; branded: boolean; paddingIn: number; titleYIn: number; titleHeightIn: number; contentYIn: number; contentHeightIn: number; contentGapIn: number; typography: LayoutTypography; metricsCols: 2 | 3; imageTextWidthIn: number; imageWidthIn: number; timelineGapIn: number; contentOverflow: "auto" | "visible" }`
  - `export function buildLayoutComposition(layout: SlideLayout, density: LayoutDensity, options?: { branded?: boolean }): LayoutComposition`
  - `export function inToPx(inches: number): number`
  - `export function ptToPx(pt: number): number`

- [ ] **Step 1: Write failing composition tests**

```ts
// append to src/lib/slides/layout-spec.test.ts
import { buildLayoutComposition, inToPx, ptToPx } from "@/lib/slides/layout-spec";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/lib/slides/layout-spec.test.ts`  
Expected: FAIL — `buildLayoutComposition` not defined

- [ ] **Step 3: Implement composition builder**

Add to `src/lib/slides/layout-spec.ts`:

```ts
export const PPTX_SLIDE_WIDTH_IN = 10;
export const PPTX_SLIDE_HEIGHT_IN = 5.625;
export const PREVIEW_REF_WIDTH_PX = 960;

const TYPOGRAPHY: Record<
  LayoutDensity,
  LayoutTypography
> = {
  airy: {
    titlePt: 32,
    bodyPt: 18,
    bulletPt: 16,
    metricValuePt: 28,
    metricLabelPt: 12,
    captionPt: 14,
  },
  comfort: {
    titlePt: 28,
    bodyPt: 16,
    bulletPt: 15,
    metricValuePt: 24,
    metricLabelPt: 11,
    captionPt: 13,
  },
  compact: {
    titlePt: 24,
    bodyPt: 14,
    bulletPt: 13,
    metricValuePt: 20,
    metricLabelPt: 10,
    captionPt: 12,
  },
};

const PADDING_RATIO: Record<LayoutDensity, number> = {
  airy: 0.08,
  comfort: 0.07,
  compact: 0.06,
};

export type LayoutTypography = {
  titlePt: number;
  bodyPt: number;
  bulletPt: number;
  metricValuePt: number;
  metricLabelPt: number;
  captionPt: number;
};

export type LayoutComposition = {
  layout: SlideLayout;
  density: LayoutDensity;
  branded: boolean;
  paddingIn: number;
  titleYIn: number;
  titleHeightIn: number;
  contentYIn: number;
  contentHeightIn: number;
  contentGapIn: number;
  typography: LayoutTypography;
  metricsCols: 2 | 3;
  imageTextWidthIn: number;
  imageWidthIn: number;
  timelineGapIn: number;
  contentOverflow: "auto" | "visible";
};

export function inToPx(inches: number): number {
  return (inches / PPTX_SLIDE_WIDTH_IN) * PREVIEW_REF_WIDTH_PX;
}

export function ptToPx(pt: number): number {
  return pt * (96 / 72);
}

export function buildLayoutComposition(
  layout: SlideLayout,
  density: LayoutDensity,
  options?: { branded?: boolean }
): LayoutComposition {
  const branded = options?.branded ?? false;
  const paddingIn = PPTX_SLIDE_HEIGHT_IN * PADDING_RATIO[density];
  const titleYIn = branded ? 0.55 : 0.4;
  const titleHeightIn = density === "airy" ? 1.0 : density === "comfort" ? 0.9 : 0.8;
  const contentYIn = titleYIn + titleHeightIn + (density === "airy" ? 0.25 : 0.15);
  const contentHeightIn =
    PPTX_SLIDE_HEIGHT_IN - contentYIn - paddingIn;
  const contentGapIn =
    density === "airy" ? 0.35 : density === "comfort" ? 0.28 : 0.22;
  const imageTextWidthIn = density === "compact" ? 4.2 : 4.3;
  const imageWidthIn = 4.4;
  const metricsCols = density === "compact" ? 3 : 2;
  const timelineGapIn =
    density === "airy" ? 0.6 : density === "comfort" ? 0.5 : 0.45;
  const extremeCompact = density === "compact";

  return {
    layout,
    density,
    branded,
    paddingIn,
    titleYIn,
    titleHeightIn,
    contentYIn,
    contentHeightIn,
    contentGapIn,
    typography: TYPOGRAPHY[density],
    metricsCols,
    imageTextWidthIn,
    imageWidthIn,
    timelineGapIn,
    contentOverflow: extremeCompact ? "auto" : "visible",
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- --run src/lib/slides/layout-spec.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/slides/layout-spec.ts src/lib/slides/layout-spec.test.ts
git commit -m "Add layout composition builder with PPTX geometry constants."
```

---

### Task 3: Resolver, preview styles, and parity tests

**Files:**
- Modify: `src/lib/slides/layout-spec.ts`
- Create: `src/lib/slides/layout-spec-parity.test.ts`

**Interfaces:**
- Produces:
  - `export type PreviewCompositionStyles = { paddingPx: number; titleClass: string; titleStyle: { fontSize: string }; bodyClass: string; bodyStyle: { fontSize: string }; bulletClass: string; bulletStyle: { fontSize: string }; contentClass: string; titleMarginBottomPx: number; contentGapPx: number }`
  - `export function resolveLayoutComposition(slide: Slide, options?: { branded?: boolean }): LayoutComposition`
  - `export function compositionToPreviewStyles(composition: LayoutComposition): PreviewCompositionStyles`

- [ ] **Step 1: Write failing resolver and parity tests**

```ts
// src/lib/slides/layout-spec-parity.test.ts
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
  it("When airy branded bullets, contentY px should match contentYIn conversion within 2px", () => {
    const comp = buildLayoutComposition("bullets", "airy", { branded: true });
    const styles = compositionToPreviewStyles(comp);
    const contentYPx = inToPx(comp.contentYIn);
    expect(Math.abs(contentYPx - (styles.paddingPx + styles.titleMarginBottomPx))).toBeLessThanOrEqual(2);
  });

  it("When comfort density, title pt should match title preview font size", () => {
    const comp = buildLayoutComposition("bullets", "comfort");
    const styles = compositionToPreviewStyles(comp);
    expect(styles.titleStyle.fontSize).toBe(`${ptToPx(comp.typography.titlePt)}px`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/lib/slides/layout-spec-parity.test.ts`  
Expected: FAIL

- [ ] **Step 3: Implement resolver and preview mapper**

Add to `layout-spec.ts`:

```ts
export type PreviewCompositionStyles = {
  paddingPx: number;
  titleClass: string;
  titleStyle: { fontSize: string };
  bodyClass: string;
  bodyStyle: { fontSize: string };
  bulletClass: string;
  bulletStyle: { fontSize: string };
  contentClass: string;
  titleMarginBottomPx: number;
  contentGapPx: number;
};

const TITLE_CLASS: Record<LayoutDensity, string> = {
  airy: "font-bold tracking-tight",
  comfort: "font-semibold tracking-tight",
  compact: "font-semibold",
};

export function resolveLayoutComposition(
  slide: Slide,
  options?: { branded?: boolean }
): LayoutComposition {
  const signals = countContentSignals(slide);
  const density = pickDensity(slide.layout, signals);
  return buildLayoutComposition(slide.layout, density, options);
}

export function compositionToPreviewStyles(
  composition: LayoutComposition
): PreviewCompositionStyles {
  const paddingPx = inToPx(composition.paddingIn);
  const titleSizePx = ptToPx(composition.typography.titlePt);
  const bodySizePx = ptToPx(composition.typography.bodyPt);
  const bulletSizePx = ptToPx(composition.typography.bulletPt);
  const titleMarginBottomPx = inToPx(
    composition.contentYIn - composition.titleYIn - composition.titleHeightIn
  );

  return {
    paddingPx,
    titleClass: TITLE_CLASS[composition.density],
    titleStyle: { fontSize: `${titleSizePx}px` },
    bodyClass: composition.density === "compact" ? "" : "leading-relaxed",
    bodyStyle: { fontSize: `${bodySizePx}px` },
    bulletClass: cnList(
      "list-disc pl-5",
      composition.density === "airy" ? "space-y-3" : composition.density === "comfort" ? "space-y-2" : "space-y-1"
    ),
    bulletStyle: { fontSize: `${bulletSizePx}px` },
    contentClass:
      composition.contentOverflow === "auto" ? "min-h-0 overflow-auto" : "",
    titleMarginBottomPx,
    contentGapPx: inToPx(composition.contentGapIn),
  };
}

function cnList(...parts: string[]) {
  return parts.filter(Boolean).join(" ");
}
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- --run src/lib/slides/layout-spec.test.ts src/lib/slides/layout-spec-parity.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/slides/layout-spec.ts src/lib/slides/layout-spec-parity.test.ts
git commit -m "Add layout composition resolver and preview style mapper."
```

---

### Task 4: Wire PPTX export to composition

**Files:**
- Modify: `src/lib/export/layouts/types.ts`
- Modify: `src/lib/export/pptx.ts`
- Modify: `src/lib/export/layouts/index.ts`

**Interfaces:**
- Consumes: `resolveLayoutComposition`, `LayoutComposition`, `PPTX_SLIDE_WIDTH_IN` (margin x = paddingIn)

- [ ] **Step 1: Extend PptxLayoutContext**

```ts
// src/lib/export/layouts/types.ts — add import and field
import type { LayoutComposition } from "@/lib/slides/layout-spec";

export type PptxLayoutContext = {
  pptxSlide: PptxGenJS.Slide;
  slide: Slide;
  theme: BrandTheme;
  colors: SlideColors;
  font: string;
  composition: LayoutComposition;
  branded: boolean;
};
```

Remove `contentY` from context — mappers use `composition.contentYIn`.

- [ ] **Step 2: Update pptx.ts title and mapper dispatch**

In `addSlideContent`, replace hardcoded title `y`/`fontSize` and `contentY`:

```ts
import { resolveLayoutComposition } from "@/lib/slides/layout-spec";

// inside addSlideContent, after branded accent bar:
const composition = resolveLayoutComposition(slide, { branded });

pptxSlide.addText(richTextToPlainText(slide.title), {
  x: composition.paddingIn,
  y: composition.titleYIn,
  w: PPTX_SLIDE_WIDTH_IN - composition.paddingIn * 2,
  h: composition.titleHeightIn,
  fontSize: composition.typography.titlePt,
  bold: true,
  color: stripHexHash(colors.primary),
  fontFace: font,
});

const mapper = PPTX_LAYOUT_MAPPERS[slide.layout as SlideLayout];
mapper({
  pptxSlide,
  slide,
  theme,
  colors,
  font,
  composition,
  branded,
});
```

Import `PPTX_SLIDE_WIDTH_IN` from layout-spec for title slide branding in a follow-up edit within same file.

- [ ] **Step 3: Update layout mappers to use composition**

Example for `mapBulletsLayout`:

```ts
export const mapBulletsLayout: PptxLayoutMapper = ({
  pptxSlide,
  slide,
  font,
  colors,
  composition,
}) => {
  const bullets = slide.content.bullets ?? [];
  const hasImage = Boolean(slide.content.imageUrl);
  const textW = hasImage ? composition.imageTextWidthIn : PPTX_SLIDE_WIDTH_IN - composition.paddingIn * 2;
  const textOpts = {
    fontSize: composition.typography.bulletPt,
    fontFace: font,
    color: stripHex(colors.muted),
  };
  const x = composition.paddingIn;
  const y = composition.contentYIn;
  const h = composition.contentHeightIn;

  // ... same logic, replace contentY → y, fontSize 16 → composition.typography.bulletPt
  if (hasImage && slide.content.imageUrl) {
    pptxSlide.addImage({
      path: slide.content.imageUrl,
      x: composition.paddingIn + composition.imageTextWidthIn + 0.2,
      y,
      w: composition.imageWidthIn,
      h: Math.min(h, 3.8),
    });
  }
};
```

Apply the same pattern to: `mapMetricsGridLayout` (use `metricsCols`, `metricValuePt`, `metricLabelPt`, `contentGapIn`), `mapTimelineLayout` (`timelineGapIn`), `mapTwoColumnLayout`, `mapImageCaptionLayout`, `mapChartLayout`, `mapQuoteLayout`, `mapSectionBreakLayout`, `mapTitleLayout`.

For `mapQuoteLayout`, use composition typography for quote (`titlePt`) and caption (`captionPt`), centered using `contentYIn`.

- [ ] **Step 4: Run export tests**

Run: `npm run test -- --run src/lib/export/pptx.test.ts`  
Expected: PASS (buffer still generated)

- [ ] **Step 5: Commit**

```bash
git add src/lib/export/layouts/types.ts src/lib/export/pptx.ts src/lib/export/layouts/index.ts
git commit -m "Wire PPTX export layout mappers to shared layout composition."
```

---

### Task 5: Wire slide preview to composition

**Files:**
- Modify: `src/components/slides/slide-preview.tsx`
- Modify: `src/components/slides/slide-preview.test.tsx`

**Interfaces:**
- Consumes: `resolveLayoutComposition`, `compositionToPreviewStyles`, `inToPx`, `ptToPx`

- [ ] **Step 1: Write failing preview density test**

```ts
// append to slide-preview.test.tsx
it("When 6 bullets, title font size should be smaller than 2-bullet airy slide", () => {
  const airy = {
    id: "a",
    order: 0,
    type: "content" as const,
    layout: "bullets" as const,
    title: "Few",
    content: { bullets: ["One", "Two"] },
  };
  const compact = {
    id: "b",
    order: 1,
    type: "content" as const,
    layout: "bullets" as const,
    title: "Many",
    content: {
      bullets: ["1", "2", "3", "4", "5", "6"],
    },
  };

  const { container: airyContainer } = render(<SlidePreview slide={airy} />);
  const { container: compactContainer } = render(<SlidePreview slide={compact} />);

  const airyTitle = airyContainer.querySelector("h2");
  const compactTitle = compactContainer.querySelector("h2");
  const airySize = Number(airyTitle?.style.fontSize.replace("px", ""));
  const compactSize = Number(compactTitle?.style.fontSize.replace("px", ""));
  expect(compactSize).toBeLessThan(airySize);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- --run src/components/slides/slide-preview.test.tsx`  
Expected: FAIL (sizes equal or missing inline fontSize)

- [ ] **Step 3: Integrate composition in SlideLayoutContent**

At top of `SlideLayoutContent`, resolve composition and styles:

```ts
import {
  resolveLayoutComposition,
  compositionToPreviewStyles,
} from "@/lib/slides/layout-spec";

// inside SlideLayoutContent, add branded prop from parent:
const composition = resolveLayoutComposition(
  { layout, title, content, id: "", order: 0, type: "" },
  { branded: Boolean(logoUrl) }
);
const styles = compositionToPreviewStyles(composition);

const renderTitle = (extraClass?: string) =>
  block(
    <h2
      className={cn(styles.titleClass, extraClass)}
      style={{ ...titleStyle, ...styles.titleStyle, marginBottom: styles.titleMarginBottomPx }}
    >
      <RichTextContent html={title} />
    </h2>,
    CONTENT_ANIM_DELAY.title
  );
```

Replace outer slide padding `p-8` in `SlidePreview` with dynamic `style={{ padding: styles.paddingPx }}` — pass styles from `SlideLayoutContent` or resolve once in `SlidePreview` and pass down.

Replace layout-specific hardcoded classes:
- `mb-4 text-xl font-semibold` on titles → `renderTitle()` only
- `text-sm` on bullets → `styles.bulletClass` + `styles.bulletStyle`
- `text-3xl font-bold` on title layout → composition-driven sizes
- Metrics grid: use `composition.metricsCols` for `grid-cols-2` vs `grid-cols-3`
- Content wrappers: add `styles.contentClass` for overflow on compact layouts

- [ ] **Step 4: Run preview tests**

Run: `npm run test -- --run src/components/slides/slide-preview.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/slides/slide-preview.tsx src/components/slides/slide-preview.test.tsx
git commit -m "Apply shared layout composition to slide preview rendering."
```

---

### Task 6: Branded title slide and final verification

**Files:**
- Modify: `src/lib/export/pptx.ts`
- Modify: `src/lib/export/pptx.test.ts`

- [ ] **Step 1: Align branded title slide with composition**

Update `addTitleSlideBranding` to use `resolveLayoutComposition(slide, { branded: true })` for subtitle `fontSize` and vertical positions instead of hardcoded `titleY = 1.8` / `fontSize: 18`.

- [ ] **Step 2: Add export composition smoke test**

```ts
// append to pptx.test.ts
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
```

- [ ] **Step 3: Run full related test suite**

Run: `npm run test -- --run src/lib/slides/layout-spec.test.ts src/lib/slides/layout-spec-parity.test.ts src/lib/export/pptx.test.ts src/components/slides/slide-preview.test.tsx`  
Expected: all PASS

- [ ] **Step 4: Manual QA** (from spec)

1. 2-bullet slide → airy spacing in preview and PPTX  
2. 6-bullet slide → compact but readable  
3. Branded export → accent bar + title band aligned  
4. `metrics_grid` 2 vs 6 metrics → column density changes  
5. `title` / `section_break` → airy hierarchy  

- [ ] **Step 5: Commit**

```bash
git add src/lib/export/pptx.ts src/lib/export/pptx.test.ts
git commit -m "Align branded title export and add compact deck export smoke test."
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Shared `layout-spec.ts` | Tasks 1–3 |
| Deterministic density | Task 1 |
| Preview/export parity | Tasks 3, 4, 5 |
| Compute at render time | Tasks 3–5 |
| Branded geometry | Tasks 2, 4, 6 |
| Extreme volume overflow | Task 2 (`contentOverflow`) + Task 5 |
| Rich text plain-text signals | Task 1 |
| No new layouts / no AI / no DB | Global constraints |
| Testing matrix | Tasks 1–6 |

No placeholders remain. Type names consistent across tasks.
