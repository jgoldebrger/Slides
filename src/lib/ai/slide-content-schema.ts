import { z } from "zod";
import type { SlideLayout } from "@/types/slide";

const metricSchema = z.object({
  label: z.string(),
  value: z.string(),
  trend: z.enum(["up", "down", "flat"]),
});

const baseSlideFill = z.object({
  title: z.string(),
  // OpenAI structured output requires all properties be required (no .optional()).
  speakerNotes: z.string(),
});

const titleSlideSchema = baseSlideFill.extend({
  content: z.object({ body: z.string() }),
});

const bulletsSlideSchema = baseSlideFill.extend({
  content: z.object({
    bullets: z.array(z.string()).min(1).max(8),
  }),
});

const metricsGridSlideSchema = baseSlideFill.extend({
  content: z.object({
    metrics: z.array(metricSchema).min(2).max(6),
  }),
});

const timelineSlideSchema = baseSlideFill.extend({
  content: z.object({
    bullets: z.array(z.string()).min(2).max(8),
  }),
});

const twoColumnSlideSchema = baseSlideFill.extend({
  content: z.object({
    bullets: z.array(z.string()).min(1).max(5),
    body: z.string(),
  }),
});

const imageCaptionSlideSchema = baseSlideFill.extend({
  content: z.object({
    body: z.string(),
    bullets: z.array(z.string()).max(3),
  }),
});

const chartSlideSchema = baseSlideFill.extend({
  content: z.object({
    chartData: z
      .array(
        z.object({
          name: z.string(),
          value: z.number(),
        })
      )
      .min(1)
      .max(12),
    body: z.string(),
  }),
});

const quoteSlideSchema = baseSlideFill.extend({
  content: z.object({
    quote: z.string(),
    attribution: z.string(),
  }),
});

const sectionBreakSlideSchema = baseSlideFill.extend({
  content: z.object({
    body: z.string(),
  }),
});

const contentByLayout = {
  title: titleSlideSchema,
  bullets: bulletsSlideSchema,
  metrics_grid: metricsGridSlideSchema,
  timeline: timelineSlideSchema,
  two_column: twoColumnSlideSchema,
  image_caption: imageCaptionSlideSchema,
  chart: chartSlideSchema,
  quote: quoteSlideSchema,
  section_break: sectionBreakSlideSchema,
} satisfies Record<SlideLayout, z.ZodObject<z.ZodRawShape>>;

export function slideFillSchemaForLayout(layout: SlideLayout) {
  return contentByLayout[layout];
}

export type SlideFillResult = z.infer<typeof bulletsSlideSchema>;
