import { aiTonePromptHint, type AiTone } from "@/lib/ai/tone";
import { audiencePromptHint, type DeckAudience } from "@/lib/ai/audience";
import type { SlideLayout } from "@/types/slide";

export function buildSpeakerNotesPrompt({
  title,
  layout,
  content,
  aiTone = "executive",
  audience = "general",
}: {
  title: string;
  layout: SlideLayout;
  content: unknown;
  aiTone?: AiTone;
  audience?: DeckAudience;
}) {
  return `You are an expert presentation coach for project status decks.

Generate presenter-focused speaker notes for this slide.

Voice / tone:
- ${aiTonePromptHint(aiTone)}

Audience:
- ${audiencePromptHint(audience)}

Rules:
- Use ONLY facts from the slide content — do not invent metrics or dates.
- speakerNotes: 2-4 sentences the presenter can read or paraphrase aloud.
- talkingPoints: 3-5 short bullets of what to emphasize.
- questionsToAnticipate: 1-3 likely audience questions and how to answer briefly.

Slide title: ${title}
Layout: ${layout}
Content: ${JSON.stringify(content)}`;
}
