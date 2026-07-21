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

/** Which project-update tabs/fields each deck type should emphasize. */
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

/** Per-type outline guidance so decks don't all look identical. */
export const DECK_TYPE_OUTLINE_HINTS: Record<DeckType, string> = {
  project_status:
    "Balanced status deck: progress, completed work, metrics (if data exists), risks/blockers, next steps.",
  executive_update:
    "Short and decision-focused (4-6 slides): headline progress, key metrics, top risks — combine other fields instead of dedicated slides.",
  weekly_report:
    "Recurring cadence (4-7 slides): what changed this week, tasks in flight, blockers, next week.",
  rollout_plan:
    "Phased delivery (5-8 slides): timeline/milestones, workstreams, dependencies, rollout risks.",
  project_kickoff:
    "Kickoff (5-8 slides): goals, scope/context, milestones, team/tasks, success metrics.",
  client_presentation:
    "Client-facing (5-8 slides): outcomes and value, progress highlights, risks with mitigations.",
};

export function deckTypeOutlineHint(deckType: DeckType): string {
  return DECK_TYPE_OUTLINE_HINTS[deckType];
}

export function deckTypeSectionGuidance(
  deckType: DeckType,
  coverage: SectionCoverage
): string {
  const { primary, combine } = DECK_TYPE_SECTION_FOCUS[deckType];
  const primaryFilled = primary.filter((key) => coverage[key]);
  const combineFilled = combine.filter((key) => coverage[key]);

  return `Project updates use fixed sections (the Goals / Metrics / Risks tabs) — do NOT create one slide per tab.
For this deck type:
- Prefer slides from: ${primaryFilled.length ? primaryFilled.join(", ") : primary.join(", ")}
- Fold these into existing slides instead of new ones unless content is heavy: ${combineFilled.length ? combineFilled.join(", ") : combine.join(", ")}
- Multiple sections may share one slide (e.g. risks + blockers, goals + milestones).`;
}
