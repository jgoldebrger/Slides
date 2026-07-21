import type { SlideLayout } from "@/types/slide";
import {
  mapBulletsLayout,
  mapChartLayout,
  mapImageCaptionLayout,
  mapMetricsGridLayout,
  mapQuoteLayout,
  mapSectionBreakLayout,
  mapTimelineLayout,
  mapTitleLayout,
  mapTwoColumnLayout,
} from "./index";
import type { PptxLayoutMapper } from "./types";
import { assertLayoutContractsComplete } from "@/lib/slides/layout-contract";

assertLayoutContractsComplete();

export const PPTX_LAYOUT_MAPPERS: Record<SlideLayout, PptxLayoutMapper> = {
  title: mapTitleLayout,
  bullets: mapBulletsLayout,
  metrics_grid: mapMetricsGridLayout,
  timeline: mapTimelineLayout,
  two_column: mapTwoColumnLayout,
  image_caption: mapImageCaptionLayout,
  chart: mapChartLayout,
  quote: mapQuoteLayout,
  section_break: mapSectionBreakLayout,
};
