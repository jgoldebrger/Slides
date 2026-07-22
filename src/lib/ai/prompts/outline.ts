import type { DeckOutline, DeckType } from "@/types/slide";
import { DECK_TYPE_LABELS } from "@/lib/deck-labels";
import { deckTypeFramingHint } from "@/lib/ai/deck-type-hints";
import { deckBriefPromptBlock } from "@/lib/ai/update-sections";
import { projectUpdatesPromptRules } from "@/lib/ai/project-updates-context";
import {
  contentAnalysisPromptBlock,
  type ContentAnalysis,
} from "@/lib/ai/analyze-project-updates";
import { aiTonePromptHint, type AiTone } from "@/lib/ai/tone";
import { audiencePromptHint, type DeckAudience } from "@/lib/ai/audience";

export function buildOutlinePrompt({
  deckType,
  projectName,
  projectDescription,
  updates,
  existingOutline,
  existingSlideCount,
  aiTone = "executive",
  audience = "general",
  orgStyleHint,
  includedSections,
  deckBrief,
  contentAnalysis,
}: {
  deckType: DeckType;
  projectName: string;
  projectDescription?: string | null;
  updates: Record<string, unknown>;
  existingOutline?: DeckOutline | null;
  existingSlideCount?: number;
  aiTone?: AiTone;
  audience?: DeckAudience;
  orgStyleHint?: string;
  includedSections?: import("@/lib/ai/update-sections").ProjectUpdateSectionId[];
  deckBrief?: string;
  contentAnalysis?: ContentAnalysis;
}) {
  const preserveStructure =
    existingOutline?.slides?.length &&
    (existingSlideCount ?? 0) > 0;

  const slideMin = contentAnalysis?.slideCountMin ?? 3;
  const slideMax = contentAnalysis?.slideCountMax ?? 12;
  const framingHint = deckTypeFramingHint(deckType);

  const structureRules = preserveStructure
    ? `- UPDATE the existing outline below with the latest project data.
- Keep exactly ${existingOutline!.slides.length} slides in the same order and topics.
- Preserve each slide's layout and type; update titles and summaries to reflect new data.
- Do NOT add slides for new list items — fold new content into the most relevant existing slide.
- Do NOT remove slides unless the source section was deleted from project data.`
    : `- Target ${slideMin}–${slideMax} slides based on content density (see content analysis below).
- Deck framing (soft guidance only): ${framingHint}
- Invent structure from content and the deck brief — no mandatory cover or closing slide types.`;

  const narrativeRules = `- Invent slide titles from facts and the deck brief (e.g. "Q2 revenue up 12%", not "Metrics").
- Do NOT name slides after form fields (Goals, Metrics, Risks, Progress) unless that is genuinely the best title.
- Do NOT create one slide per update tab/field — combine related facts; split only when a section is dense.
- Pick layouts from content shape: numbers → metrics_grid or chart; dates → timeline; narrative → bullets.
- Never invent filler slides for empty sections or use placeholder text ("not provided", "N/A", "no data", "TBD").`;

  const dataRules = projectUpdatesPromptRules(updates, { includedSections });

  const analysisBlock = contentAnalysis
    ? `\n${contentAnalysisPromptBlock(contentAnalysis)}\n`
    : "";

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

Target audience:
- ${audiencePromptHint(audience)}
${orgStyleHint ? `\nOrganization style (from past decks):\n- ${orgStyleHint}` : ""}
${analysisBlock}
Narrative design:
${narrativeRules}

Layout guidance:
- Choose layouts that fit each slide's content: metrics_grid for KPIs, chart for trends, timeline for milestones, bullets for narrative, title only when a cover adds value.

Rules:
- Use ONLY facts from the project data below. Do not invent metrics, dates, or achievements.
- Each slide needs: title, layout (title|bullets|metrics_grid|timeline|two_column|image_caption|chart|quote|section_break), type, and a one-sentence summary.
${dataRules}
${structureRules}

Project: ${projectName}
${projectDescription ? `Description: ${projectDescription}` : ""}
${deckBriefPromptBlock(deckBrief)}

Project data (JSON):
${JSON.stringify(updates, null, 2)}
${existingOutlineBlock}
Return structured outline JSON matching the schema.`;
}
