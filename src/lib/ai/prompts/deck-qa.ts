import { aiTonePromptHint, type AiTone } from "@/lib/ai/tone";
import { audiencePromptHint, type DeckAudience } from "@/lib/ai/audience";

export function buildDeckQaPrompt({
  deckName,
  deckType,
  slides,
  aiTone = "executive",
  audience = "general",
}: {
  deckName: string;
  deckType: string;
  slides: Array<{
    order: number;
    title: string;
    layout: string;
    content: unknown;
    speakerNotes?: string | null;
  }>;
  aiTone?: AiTone;
  audience?: DeckAudience;
}) {
  return `You are a presentation quality reviewer for project status decks.

Review this deck and return structured findings. Do NOT rewrite slides — only flag issues and suggest fixes.

Expected voice / tone:
- ${aiTonePromptHint(aiTone)}

Target audience:
- ${audiencePromptHint(audience)}

Check for:
- text_density: slides with too much text for live presenting
- metrics: missing quantitative data where a status deck should have KPIs
- titles: vague or duplicate slide titles
- duplicates: overlapping content across slides
- tone: drift from the expected voice or wrong level of detail for the audience
- risks: status deck missing risks/blockers when project data implies them
- next_steps: missing or weak closing / next steps

Deck: ${deckName} (${deckType})
Slides:
${JSON.stringify(slides, null, 2)}

Return a score 0-100, a one-sentence summary, and actionable findings with severity (info|warning|critical).
Each finding must include fixInstruction: a short imperative instruction suitable for rewrite_slide (e.g. "Shorten bullets to 4 items max", "Add Q4 revenue metric").`;
}
