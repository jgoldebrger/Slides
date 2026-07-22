import { z } from "zod";
import { DECK_TYPES, SLIDE_LAYOUTS } from "@/types/slide";
import { AI_TONES } from "@/lib/ai/tone";

export const projectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "on_hold", "completed"]).default("active"),
});

export const projectUpdateSchema = z.object({
  goals: z.array(z.string()).default([]),
  progress: z.string().max(5000).optional(),
  completed_work: z.array(z.string()).default([]),
  current_tasks: z
    .array(z.object({ title: z.string(), status: z.string().optional() }))
    .default([]),
  milestones: z
    .array(
      z.object({
        title: z.string(),
        date: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .default([]),
  metrics: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        numericValue: z.number().finite().optional().nullable(),
        trend: z.enum(["up", "down", "flat"]).optional(),
      })
    )
    .default([]),
  risks: z
    .array(z.object({ title: z.string(), severity: z.string().optional() }))
    .default([]),
  blockers: z.array(z.string()).default([]),
  next_steps: z.array(z.string()).default([]),
  screenshots: z
    .array(
      z.object({
        path: z.string(),
        caption: z.string().optional(),
      })
    )
    .default([]),
});

export const deckSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  type: z.enum(DECK_TYPES),
});

export const outlineSlideSchema = z.object({
  title: z.string(),
  layout: z.enum(SLIDE_LAYOUTS),
  type: z.string(),
  summary: z.string(),
});

export const deckOutlineSchema = z.object({
  deckType: z.enum(DECK_TYPES),
  slides: z.array(outlineSlideSchema).min(2).max(30),
});

export const slideSchema = z.object({
  title: z.string(),
  layout: z.enum(SLIDE_LAYOUTS),
  type: z.string().default("content"),
  content: z.record(z.string(), z.unknown()).default({}),
  speaker_notes: z.string().optional(),
});

export const brandKitSchema = z.object({
  name: z.string().min(1).max(100).default("Default"),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  font_style: z.enum(["sans", "serif", "mono"]).default("sans"),
  ai_tone: z.enum(AI_TONES).default("executive"),
});

export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
export type DeckInput = z.infer<typeof deckSchema>;
export type BrandKitInput = z.infer<typeof brandKitSchema>;

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/[0-9]/, "Password must include a number");

export const teamMemberInviteSchema = z.object({
  email: z.string().email("Valid email required"),
  display_name: z.string().min(1, "Name is required").max(100),
  role: z.enum(["viewer", "member", "admin", "owner"]).default("viewer"),
});

/** @deprecated Prefer teamMemberInviteSchema — password invites removed */
export const teamMemberCreateSchema = teamMemberInviteSchema;

export const teamMemberUpdateSchema = z.object({
  member_id: z.string().uuid(),
  display_name: z.string().min(1).max(100).optional(),
  role: z.enum(["viewer", "member", "admin", "owner"]).optional(),
});

export type TeamMemberInviteInput = z.infer<typeof teamMemberInviteSchema>;
export type TeamMemberCreateInput = TeamMemberInviteInput;
export type TeamMemberUpdateInput = z.infer<typeof teamMemberUpdateSchema>;

/** Optional user direction for per-slide AI rewrite (instructed rewrite). */
export const rewriteInstructionsSchema = z
  .string()
  .max(500, "Instructions must be 500 characters or fewer")
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });
