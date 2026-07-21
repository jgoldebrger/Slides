import type { DeckOutline, DeckType } from "@/types/slide";
import { DECK_TYPE_LABELS } from "@/lib/deck-labels";
import { aiTonePromptHint, type AiTone } from "@/lib/ai/tone";

export function buildOutlinePrompt({
  deckType,
  projectName,
  projectDescription,
  updates,
  existingOutline,
  existingSlideCount,
  aiTone = "executive",
}: {
  deckType: DeckType;
  projectName: string;
  projectDescription?: string | null;
  updates: Record<string, unknown>;
  existingOutline?: DeckOutline | null;
  existingSlideCount?: number;
  aiTone?: AiTone;
}) {
  const preserveStructure =
    existingOutline?.slides?.length &&
    (existingSlideCount ?? 0) > 0;

  const structureRules = preserveStructure
    ? `- UPDATE the existing outline below with the latest project data.
- Keep exactly ${existingOutline!.slides.length} slides in the same order and topics.
- Preserve each slide's layout and type; update titles and summaries to reflect new data.
- Do NOT add slides for new list items — fold new content into the most relevant existing slide.
- Do NOT remove slides unless the source section was deleted from project data.`
    : `- Prefer 8-12 slides for status updates.
- Start with a title slide and end with next steps or Q&A.`;

  const existingOutlineBlock = preserveStructure
    ? `
Existing outline to update (preserve slide count and structure):
${JSON.stringify(existingOutline, null, 2)}
`
    : "";

  return `You are an expert presentation designer for project update decks.

Create a slide outline for a "${DECK_TYPE_LABELS[deckType]}" deck.

Voice / tone:
- ${aiTonePromptHint(aiTone)}

Rules:
- Use ONLY facts from the project data below. Do not invent metrics, dates, or achievements.
- Each slide needs: title, layout (title|bullets|metrics_grid|timeline|two_column|image_caption|chart|quote|section_break), type, and a one-sentence summary.
${structureRules}

Project: ${projectName}
${projectDescription ? `Description: ${projectDescription}` : ""}

Project data (JSON):
${JSON.stringify(updates, null, 2)}
${existingOutlineBlock}
Return structured outline JSON matching the schema.`;
}
