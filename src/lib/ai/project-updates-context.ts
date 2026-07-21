import type { ProjectUpdateInput } from "@/lib/validations";
import type { DeckType } from "@/types/slide";
import {
  deckTypeSectionGuidance,
} from "@/lib/ai/deck-type-hints";
import {
  filterUpdatesBySections,
  includedSectionsPromptRules,
  type ProjectUpdateSectionId,
} from "@/lib/ai/update-sections";

const CONTENT_FIELDS = [
  "goals",
  "progress",
  "completed_work",
  "current_tasks",
  "milestones",
  "metrics",
  "risks",
  "blockers",
  "next_steps",
] as const;

export type ProjectUpdatesCoverage = {
  goals: boolean;
  progress: boolean;
  completed_work: boolean;
  current_tasks: boolean;
  milestones: boolean;
  metrics: boolean;
  risks: boolean;
  blockers: boolean;
  next_steps: boolean;
};

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasListItems(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.some((item) => {
      if (typeof item === "string") return item.trim().length > 0;
      if (item && typeof item === "object" && "title" in item) {
        return String((item as { title?: string }).title ?? "").trim().length > 0;
      }
      return false;
    })
  );
}

/** Strip DB noise and return only fields the AI should use. */
export function normalizeProjectUpdatesForAi(
  updates: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!updates) return {};

  const normalized: Record<string, unknown> = {};
  for (const key of CONTENT_FIELDS) {
    const value = updates[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && !value.trim()) continue;
    normalized[key] = value;
  }
  return normalized;
}

export function getProjectUpdatesCoverage(
  updates: Record<string, unknown> | null | undefined
): ProjectUpdatesCoverage {
  const row = updates ?? {};
  return {
    goals: hasListItems(row.goals),
    progress: hasText(row.progress),
    completed_work: hasListItems(row.completed_work),
    current_tasks: hasListItems(row.current_tasks),
    milestones: hasListItems(row.milestones),
    metrics: hasListItems(row.metrics),
    risks: hasListItems(row.risks),
    blockers: hasListItems(row.blockers),
    next_steps: hasListItems(row.next_steps),
  };
}

export function countFilledUpdateSections(
  coverage: ProjectUpdatesCoverage
): number {
  return Object.values(coverage).filter(Boolean).length;
}

export function isProjectUpdatesSparse(
  updates: Record<string, unknown> | null | undefined
): boolean {
  return countFilledUpdateSections(getProjectUpdatesCoverage(updates)) < 2;
}

export function isProjectUpdatesEmpty(
  updates: Record<string, unknown> | null | undefined
): boolean {
  return countFilledUpdateSections(getProjectUpdatesCoverage(updates)) === 0;
}

export function describeProjectUpdatesCoverage(
  coverage: ProjectUpdatesCoverage
): string {
  const filled = (Object.entries(coverage) as Array<[keyof ProjectUpdatesCoverage, boolean]>)
    .filter(([, has]) => has)
    .map(([key]) => key.replace(/_/g, " "));

  if (!filled.length) {
    return "No project update sections have content yet.";
  }
  return `Sections with data: ${filled.join(", ")}.`;
}

export function prepareProjectUpdatesForDeck(
  rawUpdates: Record<string, unknown> | null | undefined,
  includedSections: ProjectUpdateSectionId[]
): Record<string, unknown> {
  return filterUpdatesBySections(
    normalizeProjectUpdatesForAi(rawUpdates),
    includedSections
  );
}

export function projectUpdatesPromptRules(
  updates: Record<string, unknown> | null | undefined,
  options?: {
    deckType?: DeckType;
    includedSections?: ProjectUpdateSectionId[];
  }
): string {
  const coverage = getProjectUpdatesCoverage(updates);
  const filledCount = countFilledUpdateSections(coverage);
  const coverageLine = describeProjectUpdatesCoverage(coverage);

  if (options?.includedSections?.length) {
    const sectionRules = includedSectionsPromptRules(options.includedSections);
    const base =
      filledCount === 0
        ? `${coverageLine}\n- Selected sections have no content yet — use a minimal outline only.`
        : `${coverageLine}\n${sectionRules}`;
    return `${base}
- Do NOT use placeholder text ("not provided", "N/A", "no data", "TBD").`;
  }

  const sectionGuidance = options?.deckType
    ? deckTypeSectionGuidance(options.deckType, coverage)
    : "";

  if (filledCount === 0) {
    return `${coverageLine}
${sectionGuidance}
- Project updates are empty — return a minimal outline only (title slide + optional "add your project updates" placeholder slide).
- Do NOT invent goals, metrics, risks, or dates.
- Do NOT use phrases like "not provided", "N/A", "no data", or "TBD" on slide titles or summaries.`;
  }

  if (filledCount < 3) {
    return `${coverageLine}
${sectionGuidance}
- Only create slides for sections that have data above. Prefer ${Math.min(filledCount + 1, 6)} slides total, not a full 8-12 deck.
- Skip metrics, risks, timeline, and chart slides unless that section has real data.
- Do NOT use placeholder text ("not provided", "N/A", "no data", "TBD") — omit empty sections entirely.`;
  }

  return `${coverageLine}
${sectionGuidance}
- Create slides only for sections with data; do not add filler slides for missing sections.
- Never write "not provided", "N/A", "no data", or similar placeholders on slides.`;
}

export type { ProjectUpdateInput };
