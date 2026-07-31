import { layoutFillHint } from "@/lib/slides/layout-contract";
import { deckTypeFramingHint } from "@/lib/ai/deck-type-hints";
import { deckBriefPromptBlock } from "@/lib/ai/update-sections";
import { projectUpdatesPromptRules } from "@/lib/ai/project-updates-context";
import { contentAnalysisPromptBlock, type ContentAnalysis } from "@/lib/ai/analyze-project-updates";
import { aiTonePromptHint, type AiTone } from "@/lib/ai/tone";
import { audiencePromptHint, type DeckAudience } from "@/lib/ai/audience";
import { factsToPromptBlock, type UpdateFact } from "@/lib/ai/update-facts";
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
  contentAnalysis,
  scopedFacts,
  alreadyCovered,
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
  contentAnalysis?: ContentAnalysis;
  scopedFacts?: UpdateFact[];
  alreadyCovered?: Array<{ title: string; summary: string }>;
}) {
  const hintsBlock =
    extraHints.length > 0
      ? `\nAdditional guidance:\n${extraHints.map((h) => `- ${h}`).join("\n")}\n`
      : "";

  const analysisBlock = contentAnalysis
    ? `\n${contentAnalysisPromptBlock(contentAnalysis)}\n`
    : "";

  const useScopedFacts = scopedFacts !== undefined;

  const scopedBlock =
    scopedFacts && scopedFacts.length > 0
      ? `Assigned facts for THIS slide only (use only these):\n${factsToPromptBlock(scopedFacts)}`
      : useScopedFacts
        ? "Assigned facts for THIS slide: none — synthesize from the slide title/summary without inventing new metrics."
        : null;

  const coveredBlock =
    alreadyCovered && alreadyCovered.length > 0
      ? `Already covered on prior slides (do NOT repeat these facts):\n${alreadyCovered
          .map((slide) => `- ${slide.title}: ${slide.summary}`)
          .join("\n")}`
      : null;

  const notesRules = `Speaker notes rules:
- 2-4 sentences for the presenter.
- Do NOT copy or paraphrase bullet text.
- Add emphasis, audience framing, or what to skip if short on time.
- Slide ${slideIndex + 1} of ${totalSlides}: ${
    slideIndex === 0
      ? "open with why this update matters."
      : "include one transition sentence from the previous slide theme."
  }`;

  const projectDataBlock = useScopedFacts
    ? ""
    : `\nProject data (JSON):\n${JSON.stringify(updates, null, 2)}\n`;

  const scopedContextBlock = [scopedBlock, coveredBlock]
    .filter(Boolean)
    .join("\n\n");

  return `You are an expert presentation writer for project update decks.

Fill slide ${slideIndex + 1} of ${totalSlides} for a "${deckType}" deck.
Framing: ${deckTypeFramingHint(deckType)}

Voice / tone:
- ${aiTonePromptHint(aiTone)}

Target audience:
- ${audiencePromptHint(audience)}
${analysisBlock}
Rules:
- Use ONLY facts from the project data below. Do not invent metrics, dates, or achievements.
- ${projectUpdatesPromptRules(updates, { includedSections })}
- Match the requested layout: ${outlineSlide.layout}
- ${layoutFillHint(outlineSlide.layout)}
${hintsBlock}${outlineSlide.layout === "chart" ? "- For chart slides: include a one-sentence takeaway in body and chartData sourced from project metrics." : ""}
- Write clear copy suitable for a live presentation.
${notesRules}

Outline slide:
- Title: ${outlineSlide.title}
- Type: ${outlineSlide.type}
- Summary: ${outlineSlide.summary}

Project: ${projectName}
${projectDescription ? `Description: ${projectDescription}` : ""}
${deckBriefPromptBlock(deckBrief)}
${scopedContextBlock ? `\n${scopedContextBlock}\n` : ""}${projectDataBlock}
Return structured JSON matching the schema for this layout.`;
}
