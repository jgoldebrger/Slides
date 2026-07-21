import { assertInngestConfigured } from "./config";
import { inngest } from "./client";
import { PublicError, toPublicError } from "@/lib/errors/public-error";

export type DeckEventName =
  | "deck/outline.generate"
  | "deck/generate"
  | "deck/refresh"
  | "deck/export"
  | "deck/slide.rewrite"
  | "deck/slide.visual"
  | "deck/slide.background"
  | "deck/speaker-notes.generate"
  | "deck/qa.run"
  | "deck/slide.chart-narrative"
  | "deck/slide.alt-text"
  | "deck/share-blurb.generate"
  | "deck/translate"
  | "deck/narrate";

export async function sendDeckEvent(
  name: DeckEventName,
  data: Record<string, unknown>
) {
  assertInngestConfigured();

  try {
    await inngest.send({ name, data });
  } catch (err) {
    if (err instanceof PublicError) throw err;
    throw new PublicError(
      toPublicError(err, "Failed to queue background job. Please try again.")
    );
  }
}
