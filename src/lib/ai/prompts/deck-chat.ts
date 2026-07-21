import { audiencePromptHint, type DeckAudience } from "@/lib/ai/audience";
import { aiTonePromptHint, type AiTone } from "@/lib/ai/tone";
import { SLIDE_LAYOUTS } from "@/types/slide";

export function buildDeckChatPrompt({
  deckName,
  slides,
  userMessage,
  aiTone = "executive",
  audience = "general",
}: {
  deckName: string;
  slides: Array<{ order: number; title: string; layout: string }>;
  userMessage: string;
  aiTone?: AiTone;
  audience?: DeckAudience;
}) {
  return `You are an AI assistant helping edit a project status presentation deck.

Voice / tone for any generated content:
- ${aiTonePromptHint(aiTone)}

Target audience:
- ${audiencePromptHint(audience)}

Deck: ${deckName}
Slides (1-based order):
${slides.map((s) => `${s.order + 1}. [${s.layout}] ${s.title}`).join("\n")}

Available action types (return 0-5 actions to execute):
- rewrite_slide: rewrite an existing slide (slideOrder is 1-based, instructions required)
- add_slide: insert a new slide (title, layout, optional position, contentHint for what to include)
- delete_slide: remove a slide by order (1-based)
- select_slide: focus the editor on a slide (1-based)
- run_deck_qa: run a quality review on the whole deck
- generate_speaker_notes: generate presenter notes (optional slideOrder; omit for all slides)
- reorder_slides: move a slide to a new position (slideOrder and newPosition are 1-based)

Layouts: ${SLIDE_LAYOUTS.join(", ")}

Rules:
- Prefer minimal, safe actions that match the user request.
- Use slide numbers as shown (1-based).
- If the request is unclear, reply with guidance and return no actions.
- Do not invent metrics or dates in instructions.
- For "tone down slide N", use rewrite_slide with calmer/shorter instructions.

User message:
${userMessage}`;
}
