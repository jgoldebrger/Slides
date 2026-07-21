import { layoutFillHint } from "@/lib/slides/layout-contract";
import { deckTypeOutlineHint } from "@/lib/ai/deck-type-hints";
import { deckBriefPromptBlock } from "@/lib/ai/update-sections";
import { projectUpdatesPromptRules } from "@/lib/ai/project-updates-context";
import { aiTonePromptHint, type AiTone } from "@/lib/ai/tone";
import { audiencePromptHint, type DeckAudience } from "@/lib/ai/audience";
import type { DeckType, OutlineSlide } from "@/types/slide";

export function buildSlideFillPrompt({
  deckType,
  projectName,
  projectDescription,
  updates,
  outlineSlide,
  slideIndex,
  totalSlides,
  aiTone = "executive",
  audience = "general",
  extraHints = [],
  includedSections,
  deckBrief,
}: {
  deckType: DeckType;
  projectName: string;
  projectDescription?: string | null;
  updates: Record<string, unknown>;
  outlineSlide: OutlineSlide;
  slideIndex: number;
  totalSlides: number;
  aiTone?: AiTone;
  audience?: DeckAudience;
  extraHints?: string[];
  includedSections?: import("@/lib/ai/update-sections").ProjectUpdateSectionId[];
  deckBrief?: string;
}) {
  const hintsBlock =
    extraHints.length > 0
      ? `\nAdditional guidance:\n${extraHints.map((h) => `- ${h}`).join("\n")}\n`
      : "";

  return `You are an expert presentation writer for project update decks.

Fill slide ${slideIndex + 1} of ${totalSlides} for a "${deckType}" deck.
Deck style: ${deckTypeOutlineHint(deckType)}

Voice / tone:
- ${aiTonePromptHint(aiTone)}

Target audience:
- ${audiencePromptHint(audience)}

Rules:
- Use ONLY facts from the project data below. Do not invent metrics, dates, or achievements.
- ${projectUpdatesPromptRules(updates, { deckType, includedSections })}
- Match the requested layout: ${outlineSlide.layout}
- ${layoutFillHint(outlineSlide.layout)}
${hintsBlock}${outlineSlide.layout === "chart" ? "- For chart slides: include a one-sentence takeaway in body and chartData sourced from project metrics." : ""}
- Write clear copy suitable for a live presentation.
- Include brief speaker notes for the presenter.

Outline slide:
- Title: ${outlineSlide.title}
- Type: ${outlineSlide.type}
- Summary: ${outlineSlide.summary}

Project: ${projectName}
${projectDescription ? `Description: ${projectDescription}` : ""}
${deckBriefPromptBlock(deckBrief)}

Project data (JSON):
${JSON.stringify(updates, null, 2)}

Return structured JSON matching the schema for this layout.`;
}
