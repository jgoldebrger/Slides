import type { ContentAnalysis } from "@/lib/ai/analyze-project-updates";
import type { UpdateFact } from "@/lib/ai/update-facts";
import type { DeckOutline } from "@/types/slide";

export function buildSlideContentPlanPrompt({
  outline,
  facts,
  contentAnalysis,
}: {
  outline: DeckOutline;
  facts: UpdateFact[];
  contentAnalysis: ContentAnalysis;
}) {
  return `Assign each project fact to exactly ONE content slide.

Rules:
- Match facts to the slide whose title/summary best fits.
- Do NOT assign the same factId to multiple slides.
- Title or recap slides: role "title" or "recap", factIds [].
- Every factId should appear on exactly one "content" slide when possible.
- Return one entry per outline slide index (0 through ${outline.slides.length - 1}).

Outline slides:
${outline.slides.map((slide, index) => `${index}. ${slide.title} — ${slide.summary} (layout: ${slide.layout})`).join("\n")}

Facts (id | section | label):
${facts.map((fact) => `${fact.id} | ${fact.section} | ${fact.label}`).join("\n")}

Content analysis: ${contentAnalysis.contentDigest}

Return JSON: { entries: [{ slideIndex, factIds, role, focus }] }`;
}
