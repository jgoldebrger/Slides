export const DECK_TYPES = [
  "project_status",
  "executive_update",
  "weekly_report",
  "rollout_plan",
  "project_kickoff",
  "client_presentation",
] as const;

export type DeckType = (typeof DECK_TYPES)[number];

export const SLIDE_LAYOUTS = [
  "title",
  "bullets",
  "metrics_grid",
  "timeline",
  "two_column",
  "image_caption",
  "chart",
  "quote",
  "section_break",
] as const;

export type SlideLayout = (typeof SLIDE_LAYOUTS)[number];

export interface SlideMetric {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
}

export interface SlideContent {
  bullets?: string[];
  metrics?: SlideMetric[];
  body?: string;
  imageUrl?: string;
  imagePath?: string;
  imageAlt?: string;
  backgroundImageUrl?: string;
  backgroundImagePath?: string;
  chartData?: Array<{ name?: string; label?: string; value: string | number } & Record<string, string | number>>;
  quote?: string;
  attribution?: string;
}

export interface Slide {
  id: string;
  order: number;
  type: string;
  layout: SlideLayout;
  title: string;
  content: SlideContent;
  speakerNotes?: string;
  metadata?: Record<string, unknown>;
}

export interface OutlineSlide {
  title: string;
  layout: SlideLayout;
  type: string;
  summary: string;
}

export interface DeckOutline {
  deckType: DeckType;
  slides: OutlineSlide[];
}
