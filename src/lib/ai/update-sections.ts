import type { DeckType } from "@/types/slide";
import { DECK_TYPE_SECTION_FOCUS } from "@/lib/ai/deck-type-hints";

export const PROJECT_UPDATE_SECTIONS = [
  { id: "goals", label: "Goals", tab: "essential" },
  { id: "progress", label: "Progress", tab: "essential" },
  { id: "metrics", label: "Metrics", tab: "essential" },
  { id: "risks", label: "Risks", tab: "essential" },
  { id: "completed_work", label: "Completed work", tab: "more" },
  { id: "current_tasks", label: "Tasks", tab: "more" },
  { id: "milestones", label: "Milestones", tab: "more" },
  { id: "blockers", label: "Blockers", tab: "more" },
  { id: "next_steps", label: "Next steps", tab: "more" },
] as const;

export type ProjectUpdateSectionId =
  (typeof PROJECT_UPDATE_SECTIONS)[number]["id"];

export const PROJECT_UPDATE_SECTION_IDS = PROJECT_UPDATE_SECTIONS.map(
  (s) => s.id
) as ProjectUpdateSectionId[];

export function sectionLabel(id: ProjectUpdateSectionId): string {
  return PROJECT_UPDATE_SECTIONS.find((s) => s.id === id)?.label ?? id;
}

/** Default included sections for a deck type (primary focus areas). */
export function defaultIncludedSectionsForDeckType(
  deckType: DeckType
): ProjectUpdateSectionId[] {
  return [...DECK_TYPE_SECTION_FOCUS[deckType].primary];
}

export function allSectionsForDeckType(
  deckType: DeckType
): ProjectUpdateSectionId[] {
  const { primary, combine } = DECK_TYPE_SECTION_FOCUS[deckType];
  return [...new Set([...primary, ...combine])];
}

export function filterUpdatesBySections(
  updates: Record<string, unknown>,
  includedSections: ProjectUpdateSectionId[]
): Record<string, unknown> {
  const allowed = new Set(includedSections);
  const filtered: Record<string, unknown> = {};
  for (const key of PROJECT_UPDATE_SECTION_IDS) {
    if (allowed.has(key) && updates[key] !== undefined) {
      filtered[key] = updates[key];
    }
  }
  return filtered;
}

export function includedSectionsPromptRules(
  includedSections: ProjectUpdateSectionId[]
): string {
  const labels = includedSections.map((id) => sectionLabel(id));
  return `Use ONLY these project update sections as slide sources: ${labels.join(", ")}.
Do not create slides for any other update fields. Sections not listed were excluded by the user for this deck.`;
}

export function deckBriefPromptBlock(deckBrief: string | undefined): string {
  const trimmed = deckBrief?.trim();
  if (!trimmed) return "";
  return `
Deck-specific brief from the author (follow this for framing and emphasis):
${trimmed}`;
}
