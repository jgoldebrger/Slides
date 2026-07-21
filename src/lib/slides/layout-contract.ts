import type { SlideLayout } from "@/types/slide";
import { SLIDE_LAYOUTS } from "@/types/slide";

/**
 * Shared layout IR — content slots and hints used by AI prompts, preview,
 * and export. Layout-specific React/PPTX renderers remain separate, but must
 * honor the same slot names from Slide content.
 */
export type LayoutSlot =
  | "title"
  | "body"
  | "bullets"
  | "metrics"
  | "chartData"
  | "quote"
  | "attribution"
  | "image"
  | "speakerNotes";

export type LayoutContract = {
  slots: readonly LayoutSlot[];
  /** Hint for AI fill / rewrite prompts */
  fillHint: string;
  /** What preview and PPTX must render from content */
  renderHint: string;
};

export const LAYOUT_CONTRACT: Record<SlideLayout, LayoutContract> = {
  title: {
    slots: ["title", "body", "speakerNotes"],
    fillHint: "A title slide with a short subtitle in body (one line).",
    renderHint: "Large title + optional subtitle body",
  },
  bullets: {
    slots: ["title", "bullets", "image", "speakerNotes"],
    fillHint: "3-6 concise bullet points drawn from project data.",
    renderHint: "Title + bullet list; optional side image",
  },
  metrics_grid: {
    slots: ["title", "metrics", "speakerNotes"],
    fillHint:
      "2-6 metrics with label, value, and optional trend (up|down|flat).",
    renderHint: "Title + metric cards grid",
  },
  timeline: {
    slots: ["title", "bullets", "speakerNotes"],
    fillHint:
      "Timeline items as bullets with dates or milestones from project data.",
    renderHint: "Title + chronological bullet/timeline items",
  },
  two_column: {
    slots: ["title", "bullets", "body", "speakerNotes"],
    fillHint: "Left column bullets and a right column body summary.",
    renderHint: "Title + left bullets + right body",
  },
  image_caption: {
    slots: ["title", "body", "bullets", "image", "speakerNotes"],
    fillHint: "Body text describing the visual; bullets optional.",
    renderHint: "Title + image + caption body",
  },
  chart: {
    slots: ["title", "chartData", "speakerNotes"],
    fillHint:
      "chartData array of {name, value:number} from real project metrics only. Parse numeric values from metric strings (e.g. 42% → 42, $1.2k → 1200). Do not invent numbers.",
    renderHint: "Title + chart from chartData",
  },
  quote: {
    slots: ["title", "quote", "attribution", "speakerNotes"],
    fillHint:
      "A quote and optional attribution from project stakeholders or status.",
    renderHint: "Quote text + optional attribution",
  },
  section_break: {
    slots: ["title", "body", "speakerNotes"],
    fillHint: "A short section title with minimal body text.",
    renderHint: "Section title + minimal body",
  },
};

/** Ensures every SlideLayout has a contract (compile + runtime guard). */
export function assertLayoutContractsComplete() {
  for (const layout of SLIDE_LAYOUTS) {
    if (!LAYOUT_CONTRACT[layout]) {
      throw new Error(`Missing LAYOUT_CONTRACT for ${layout}`);
    }
  }
}

export function layoutFillHint(layout: SlideLayout): string {
  return LAYOUT_CONTRACT[layout].fillHint;
}
