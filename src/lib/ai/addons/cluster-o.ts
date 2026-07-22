import { z } from "zod";
import { addonLlm } from "@/lib/ai/addons/helpers";

export async function o95MoodboardTheme(imageDescription: string) {
  const schema = z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    fontSuggestion: z.string(),
    mood: z.string(),
  });
  return addonLlm(schema, `Theme tokens from moodboard: ${imageDescription}`);
}

export async function o96HumorDial(text: string, level: number) {
  const schema = z.object({ text: z.string() });
  return addonLlm(
    schema,
    `Lighten tone (meme-free, professional) level ${level}/5.\n${text}`
  );
}

export async function o97Eli5Mode(slideContent: string) {
  const schema = z.object({
    simplified: z.string(),
    glossary: z.array(z.object({ term: z.string(), definition: z.string() })),
  });
  return addonLlm(schema, `Explain like I'm new.\n${slideContent}`);
}

export async function o98CompetitiveTeardown(competitorPaste: string) {
  const schema = z.object({
    gaps: z.array(z.string()),
    opportunities: z.array(z.string()),
    avoidClaims: z.array(z.string()),
  });
  return addonLlm(
    schema,
    `Gap analysis from user-provided competitor content only.\n${competitorPaste}`
  );
}

export async function o99WinReel(history: unknown) {
  const schema = z.object({
    milestones: z.array(z.object({ title: z.string(), celebration: z.string() })),
    reelScript: z.string(),
  });
  return addonLlm(schema, `Anniversary win reel from history.\n${JSON.stringify(history)}`);
}

export async function o100PairPresenter(question: string, deckContext: unknown) {
  const schema = z.object({
    answer: z.string(),
    handoffCue: z.string(),
  });
  return addonLlm(
    schema,
    `Second presenter answers while human presents. Q: ${question}\nDeck: ${JSON.stringify(deckContext)}`
  );
}
