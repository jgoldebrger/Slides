import { aiTonePromptHint, type AiTone } from "@/lib/ai/tone";
import type { SlideLayout } from "@/types/slide";

export function buildRewriteSlidePrompt({
  layout,
  title,
  content,
  aiTone = "executive",
}: {
  layout: SlideLayout;
  title: string;
  content: unknown;
  aiTone?: AiTone;
}) {
  return `Rewrite this slide for a project update deck. Keep factual — do not invent metrics or dates.

Voice / tone:
- ${aiTonePromptHint(aiTone)}

Layout: ${layout}
Title: ${title}
Current content: ${JSON.stringify(content)}`;
}
