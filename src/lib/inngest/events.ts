import { inngest } from "./client";

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
  await inngest.send({ name, data });
}
