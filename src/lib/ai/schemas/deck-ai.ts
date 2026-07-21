import { z } from "zod";

export const speakerNotesResultSchema = z.object({
  speakerNotes: z.string(),
  talkingPoints: z.array(z.string()).max(6),
  questionsToAnticipate: z.array(z.string()).max(4),
});

export const deckQaFindingSchema = z.object({
  severity: z.enum(["info", "warning", "critical"]),
  category: z.enum([
    "text_density",
    "metrics",
    "titles",
    "duplicates",
    "tone",
    "risks",
    "next_steps",
  ]),
  slideOrder: z.number().nullable(),
  slideTitle: z.string().nullable(),
  message: z.string(),
  suggestion: z.string(),
  fixInstruction: z.string().max(500),
});

export const deckQaResultSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  findings: z.array(deckQaFindingSchema),
});

export const chartNarrativeSchema = z.object({
  chartType: z.enum(["bar", "line", "pie", "area"]),
  caption: z.string(),
  takeaway: z.string(),
  body: z.string(),
  chartData: z
    .array(z.object({ name: z.string(), value: z.number() }))
    .min(1)
    .max(12),
});

export const altTextResultSchema = z.object({
  imageAlt: z.string().max(250),
});

export const shareBlurbResultSchema = z.object({
  blurb: z.string().max(1000),
});

export type DeckQaResult = z.infer<typeof deckQaResultSchema>;
export type SpeakerNotesResult = z.infer<typeof speakerNotesResultSchema>;
