import { layoutFillHint } from "@/lib/slides/layout-contract";
import type { DeckType, OutlineSlide } from "@/types/slide";

export function buildSlideFillPrompt({
  deckType,
  projectName,
  projectDescription,
  updates,
  outlineSlide,
  slideIndex,
  totalSlides,
}: {
  deckType: DeckType;
  projectName: string;
  projectDescription?: string | null;
  updates: Record<string, unknown>;
  outlineSlide: OutlineSlide;
  slideIndex: number;
  totalSlides: number;
}) {
  return `You are an expert presentation writer for project update decks.

Fill slide ${slideIndex + 1} of ${totalSlides} for a "${deckType}" deck.

Rules:
- Use ONLY facts from the project data below. Do not invent metrics, dates, or achievements.
- Match the requested layout: ${outlineSlide.layout}
- ${layoutFillHint(outlineSlide.layout)}
- Write clear, executive-ready copy suitable for a live presentation.
- Include brief speaker notes for the presenter.

Outline slide:
- Title: ${outlineSlide.title}
- Type: ${outlineSlide.type}
- Summary: ${outlineSlide.summary}

Project: ${projectName}
${projectDescription ? `Description: ${projectDescription}` : ""}

Project data (JSON):
${JSON.stringify(updates, null, 2)}

Return structured JSON matching the schema for this layout.`;
}
