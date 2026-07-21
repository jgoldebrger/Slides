import { aiTonePromptHint, type AiTone } from "@/lib/ai/tone";
import { audiencePromptHint, type DeckAudience } from "@/lib/ai/audience";
import type { SlideLayout } from "@/types/slide";

export function buildRewriteSlidePrompt({
  layout,
  title,
  content,
  aiTone = "executive",
  audience = "general",
  instructions,
}: {
  layout: SlideLayout;
  title: string;
  content: unknown;
  aiTone?: AiTone;
  audience?: DeckAudience;
  instructions?: string;
}) {
  const instructionBlock = instructions
    ? `
User rewrite instructions (follow closely):
- ${instructions}`
    : "";

  return `Rewrite this slide for a project update deck. Keep factual — do not invent metrics or dates.

Voice / tone:
- ${aiTonePromptHint(aiTone)}

Target audience:
- ${audiencePromptHint(audience)}${instructionBlock}

Layout: ${layout}
Title: ${title}
Current content: ${JSON.stringify(content)}`;
}