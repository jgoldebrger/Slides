import type { Slide } from "@/types/slide";
import { buildSlideNarration } from "@/lib/slides/narration";

export function buildPlayerNarrationPrompt({
  slide,
  slideIndex,
  slideCount,
  deckName,
}: {
  slide: Slide;
  slideIndex: number;
  slideCount: number;
  deckName: string;
}) {
  const raw = buildSlideNarration(slide);
  return `You are a professional presenter narrating "${deckName}" (slide ${slideIndex + 1} of ${slideCount}).

Rewrite the slide content as spoken narration (45-90 seconds when read aloud):
- Conversational, confident, natural transitions
- Do NOT invent facts, metrics, or dates not in the source
- Do NOT read bullets verbatim — synthesize for a live audience
- Opening slide: brief welcome; closing slide: brief wrap-up

Source content:
${raw}

Return only the spoken script text.`;
}
