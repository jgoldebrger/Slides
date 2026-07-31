import { liveQaFromDeck } from "@/lib/ai/present/index";

const DEFERRAL_REPLY =
  "I don't have that information in this presentation. I've logged your question and we'll get back to you.";

export type PlayerQaResult =
  | {
      type: "answered";
      spokenReply: string;
      citations: Array<{ field: string; excerpt: string }>;
    }
  | { type: "deferred"; spokenReply: string };

export async function answerPlayerQuestion({
  question,
  slides,
  updates,
}: {
  question: string;
  slides: Array<{ title: string; content?: unknown }>;
  updates: Record<string, unknown>;
}): Promise<PlayerQaResult> {
  const result = await liveQaFromDeck(question, slides, updates);

  if (result.grounded && result.citations.length > 0) {
    return {
      type: "answered",
      spokenReply: result.answer,
      citations: result.citations,
    };
  }

  return { type: "deferred", spokenReply: DEFERRAL_REPLY };
}
