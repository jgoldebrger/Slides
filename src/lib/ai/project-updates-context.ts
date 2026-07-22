import type { ProjectUpdateInput } from "@/lib/validations";
import {
  filterUpdatesBySections,
  includedSectionsPromptRules,
  PROJECT_UPDATE_SECTION_IDS,
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
      if (item && typeof item === "object") {
        const record = item as { title?: string; label?: string };
        const text = record.title ?? record.label ?? "";
        return String(text).trim().length > 0;
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

/** Section IDs that have substantive content in project updates. */
export function sectionsWithData(
  updates: Record<string, unknown> | null | undefined
): ProjectUpdateSectionId[] {
  const coverage = getProjectUpdatesCoverage(updates);
  return PROJECT_UPDATE_SECTION_IDS.filter((id) => coverage[id]);
}

/** Default included sections: all sections with data, or all section IDs when empty. */
export function defaultIncludedSectionsForProject(
  updates: Record<string, unknown> | null | undefined
): ProjectUpdateSectionId[] {
  const withData = sectionsWithData(updates);
  return withData.length > 0 ? withData : [...PROJECT_UPDATE_SECTION_IDS];
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
    includedSections?: ProjectUpdateSectionId[];
  }
): string {
  const coverage = getProjectUpdatesCoverage(updates);
  const coverageLine = describeProjectUpdatesCoverage(coverage);

  if (options?.includedSections?.length) {
    const sectionRules = includedSectionsPromptRules(options.includedSections);
    return `${coverageLine}
${sectionRules}
- Do NOT use placeholder text ("not provided", "N/A", "no data", "TBD").`;
  }

  return `${coverageLine}
- Use only facts present in the project data below.
- Do not add filler slides for missing sections.
- Do NOT use placeholder text ("not provided", "N/A", "no data", "TBD").`;
}

export type { ProjectUpdateInput };
