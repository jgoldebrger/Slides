import { z } from "zod";
import { SLIDE_LAYOUTS, type Slide, type SlideContent, type SlideLayout } from "@/types/slide";

const layoutSchema = z.enum(SLIDE_LAYOUTS);

/** Lenient content parse for persisted JSONB — keeps unknown fields, coerces shapes. */
const slideContentSchema = z
  .object({
    bullets: z.array(z.string()).optional(),
    metrics: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
          trend: z.enum(["up", "down", "flat"]).optional(),
        })
      )
      .optional(),
    body: z.string().optional(),
    imageUrl: z.string().optional(),
    imagePath: z.string().optional(),
    imageAlt: z.string().optional(),
    backgroundImageUrl: z.string().optional(),
    backgroundImagePath: z.string().optional(),
    chartData: z
      .array(
        z
          .object({
            name: z.string().optional(),
            label: z.string().optional(),
            value: z.union([z.string(), z.number()]),
          })
          .passthrough()
      )
      .optional(),
    quote: z.string().optional(),
    attribution: z.string().optional(),
  })
  .passthrough();

export function parseSlideContent(raw: unknown): SlideContent {
  const parsed = slideContentSchema.safeParse(raw ?? {});
  if (!parsed.success) return {};
  return parsed.data as SlideContent;
}

export function parseSlideLayout(raw: string): SlideLayout {
  const parsed = layoutSchema.safeParse(raw);
  return parsed.success ? parsed.data : "bullets";
}

export function mapDbSlide(s: {
  id: string;
  order: number;
  type: string;
  layout: string;
  title: string;
  content: unknown;
  speaker_notes?: string | null;
  metadata?: unknown;
}): Slide {
  const metadataParsed = z.record(z.string(), z.unknown()).safeParse(s.metadata ?? {});

  return {
    id: s.id,
    order: s.order,
    type: s.type,
    layout: parseSlideLayout(s.layout),
    title: s.title,
    content: parseSlideContent(s.content),
    speakerNotes: s.speaker_notes ?? undefined,
    metadata: metadataParsed.success ? metadataParsed.data : undefined,
  };
}
