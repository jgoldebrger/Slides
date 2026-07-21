import { z } from "zod";

export const meetingNotesResultSchema = z.object({
  goals: z.array(z.string()).max(20),
  progress: z.string().max(5000),
  completed_work: z.array(z.string()).max(30),
  current_tasks: z
    .array(z.object({ title: z.string(), status: z.string().optional() }))
    .max(30),
  milestones: z
    .array(
      z.object({
        title: z.string(),
        date: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .max(20),
  metrics: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        trend: z.enum(["up", "down", "flat"]).optional(),
      })
    )
    .max(20),
  risks: z
    .array(z.object({ title: z.string(), severity: z.string().optional() }))
    .max(20),
  blockers: z.array(z.string()).max(20),
  next_steps: z.array(z.string()).max(20),
});

export const updateNarrativeSchema = z.object({
  narrative: z.string().max(2000),
  highlights: z.array(z.string()).max(8),
});

export const translateDeckResultSchema = z.object({
  language: z.string(),
  slideCount: z.number(),
});

export type MeetingNotesResult = z.infer<typeof meetingNotesResultSchema>;
export type UpdateNarrativeResult = z.infer<typeof updateNarrativeSchema>;
