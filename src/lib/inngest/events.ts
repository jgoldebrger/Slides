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
  | "deck/slide.background";

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
