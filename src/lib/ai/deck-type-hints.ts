import type { DeckType } from "@/types/slide";

type UpdateSection =
  | "goals"
  | "progress"
  | "completed_work"
  | "current_tasks"
  | "milestones"
  | "metrics"
  | "risks"
  | "blockers"
  | "next_steps";

export type SectionCoverage = Record<UpdateSection, boolean>;

/** Which project-update fields each deck type emphasizes for content-focus presets. */
export const DECK_TYPE_SECTION_FOCUS: Record<
  DeckType,
  { primary: UpdateSection[]; combine: UpdateSection[] }
> = {
  project_status: {
    primary: [
      "goals",
      "progress",
      "completed_work",
      "metrics",
      "risks",
      "blockers",
      "next_steps",
    ],
    combine: ["current_tasks", "milestones"],
  },
  executive_update: {
    primary: ["progress", "metrics", "risks", "next_steps"],
    combine: ["goals", "completed_work", "blockers", "current_tasks", "milestones"],
  },
  weekly_report: {
    primary: ["progress", "completed_work", "current_tasks", "blockers", "next_steps"],
    combine: ["metrics", "risks", "goals", "milestones"],
  },
  rollout_plan: {
    primary: ["milestones", "current_tasks", "risks", "blockers", "next_steps"],
    combine: ["progress", "completed_work", "goals", "metrics"],
  },
  project_kickoff: {
    primary: ["goals", "milestones", "current_tasks", "metrics", "next_steps"],
    combine: ["progress", "risks", "blockers", "completed_work"],
  },
  client_presentation: {
    primary: ["progress", "completed_work", "metrics", "risks", "next_steps"],
    combine: ["goals", "milestones", "current_tasks", "blockers"],
  },
};

/** Soft framing only — no slide topics or counts. */
export const DECK_TYPE_FRAMING_HINTS: Record<DeckType, string> = {
  project_status: "Balanced status framing across available facts.",
  executive_update: "Prefer brevity and decision-ready framing.",
  weekly_report: "Emphasize what changed recently and what is next.",
  rollout_plan: "Emphasize phases, dependencies, and delivery timing.",
  project_kickoff: "Emphasize scope, goals, and early milestones.",
  client_presentation: "Emphasize outcomes and value; avoid internal jargon.",
};

/** @deprecated Use deckTypeFramingHint — kept for callers migrating off slide templates. */
export const DECK_TYPE_OUTLINE_HINTS = DECK_TYPE_FRAMING_HINTS;

export function deckTypeFramingHint(deckType: DeckType): string {
  return DECK_TYPE_FRAMING_HINTS[deckType];
}

export function deckTypeOutlineHint(deckType: DeckType): string {
  return deckTypeFramingHint(deckType);
}
