import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export function estimatePaceScore(
  slides: Array<{ title: string; content?: Record<string, unknown>; speaker_notes?: string }>
) {
  let words = 0;
  for (const slide of slides) {
    words += slide.title.split(/\s+/).length;
    const body = JSON.stringify(slide.content ?? {});
    words += body.split(/\s+/).length / 4;
    words += (slide.speaker_notes ?? "").split(/\s+/).length;
  }
  const minutes = Math.max(1, Math.round(words / 130));
  const densest = slides.reduce(
    (max, s, i) => {
      const w = JSON.stringify(s.content ?? {}).length;
      return w > max.w ? { i, w } : max;
    },
    { i: 0, w: 0 }
  );
  return { estimatedMinutes: minutes, wordCount: words, densestSlideIndex: densest.i };
}

export async function draftFollowUpEmail(
  deckName: string,
  slides: Array<{ title: string; content?: unknown }>,
  notes?: string
) {
  const schema = z.object({
    subject: z.string(),
    body: z.string(),
    decisions: z.array(z.string()),
    nextSteps: z.array(z.string()),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Follow-up email after presenting "${deckName}". Slides: ${JSON.stringify(slides)}. Notes: ${notes ?? ""}`,
  });
  return object;
}

export async function pickHighlightReel(
  slides: Array<{ title: string; summary?: string }>
) {
  const schema = z.object({
    slideIndices: z.array(z.number()).min(1).max(3),
    teaserLine: z.string(),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Pick 3-slide teaser from deck.\n${JSON.stringify(slides)}`,
  });
  return object;
}

export async function presenterCopilotHints(
  currentSlide: { title: string; content?: unknown },
  remainingMinutes: number
) {
  const schema = z.object({
    talkingPoints: z.array(z.string()),
    skipIfOver: z.boolean(),
    timeNote: z.string(),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Presenter copilot. Slide: ${JSON.stringify(currentSlide)}. ${remainingMinutes} min left.`,
  });
  return object;
}

export function adaptiveNarrationScript(
  script: string,
  targetSeconds: number,
  currentSeconds: number
) {
  const ratio = targetSeconds / Math.max(currentSeconds, 1);
  if (ratio >= 0.95 && ratio <= 1.05) return script;
  const targetWords = Math.max(20, Math.round(script.split(/\s+/).length * ratio));
  return script.split(/\s+/).slice(0, targetWords).join(" ") + (ratio < 1 ? "…" : "");
}

export async function summarizeAudienceDepthSwitch(
  slides: Array<{ title: string; content?: unknown }>,
  targetAudience: string
) {
  const schema = z.object({
    summary: z.string(),
    depth: z.enum(["high", "medium", "low"]),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Summarize deck for ${targetAudience} audience without regenerating.\n${JSON.stringify(slides)}`,
  });
  return object;
}

export async function liveQaFromDeck(
  question: string,
  slides: Array<{ title: string; content?: unknown }>,
  updates: Record<string, unknown>
) {
  const schema = z.object({
    answer: z.string(),
    citations: z.array(z.object({ field: z.string(), excerpt: z.string() })),
    grounded: z.boolean(),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Answer ONLY from deck + updates. Q: ${question}\nSlides: ${JSON.stringify(slides)}\nUpdates: ${JSON.stringify(updates)}`,
  });
  return object;
}

export async function proposeDeckDeltaFromRecording(
  transcript: string,
  outline: unknown
) {
  const schema = z.object({
    slideUpdates: z.array(
      z.object({ slideIndex: z.number(), change: z.string() })
    ),
    summary: z.string(),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `From meeting recording, propose deck updates.\nTranscript: ${transcript}\nOutline: ${JSON.stringify(outline)}`,
  });
  return object;
}
