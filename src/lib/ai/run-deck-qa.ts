import { createHash } from "crypto";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { loadOrgAiTone } from "@/lib/ai/load-org-tone";
import { loadDeckAudience } from "@/lib/ai/load-deck-audience";
import { buildDeckQaPrompt } from "@/lib/ai/prompts/deck-qa";
import { deckQaResultSchema } from "@/lib/ai/schemas/deck-ai";
import { createAdminClient } from "@/lib/supabase/admin";

export async function runDeckQa({
  deckId,
  generationId,
}: {
  deckId: string;
  generationId: string;
}) {
  const supabase = createAdminClient();

  await supabase
    .from("ai_generations")
    .update({ status: "processing" })
    .eq("id", generationId);

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select("name, type, org_id, metadata")
      .eq("id", deckId)
      .single();

    if (deckError || !deck) throw new Error("Deck not found");

    const { data: slides, error: slidesError } = await supabase
      .from("slides")
      .select("order, title, layout, content, speaker_notes")
      .eq("deck_id", deckId)
      .order("order");

    if (slidesError || !slides?.length) {
      throw new Error("No slides to review");
    }

    const aiTone = await loadOrgAiTone(supabase, deck.org_id);
    const audience = await loadDeckAudience(supabase, deckId);

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: deckQaResultSchema,
      prompt: buildDeckQaPrompt({
        deckName: deck.name,
        deckType: deck.type,
        slides: slides.map((s) => ({
          order: s.order,
          title: s.title,
          layout: s.layout,
          content: s.content,
          speakerNotes: s.speaker_notes,
        })),
        aiTone,
        audience,
      }),
    });

    const metadata = (deck.metadata as Record<string, unknown>) ?? {};
    await supabase
      .from("decks")
      .update({
        metadata: { ...metadata, lastQa: object },
        updated_at: new Date().toISOString(),
      })
      .eq("id", deckId);

    await supabase
      .from("ai_generations")
      .update({ status: "completed", result: object })
      .eq("id", generationId);

    return object;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Deck QA failed";
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: message })
      .eq("id", generationId);
    throw err;
  }
}

export function deckQaPromptHash(deckId: string) {
  return createHash("sha256")
    .update(`deck-qa:${deckId}:${Date.now()}`)
    .digest("hex");
}
