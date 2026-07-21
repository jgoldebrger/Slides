import { createHash } from "crypto";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { loadDeckAudience } from "@/lib/ai/load-deck-audience";
import { buildShareBlurbPrompt } from "@/lib/ai/prompts/share-blurb";
import { shareBlurbResultSchema } from "@/lib/ai/schemas/deck-ai";
import { createAdminClient } from "@/lib/supabase/admin";

export async function runGenerateShareBlurb({
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
      .select("name, type, metadata")
      .eq("id", deckId)
      .single();

    if (deckError || !deck) throw new Error("Deck not found");

    const { data: slides } = await supabase
      .from("slides")
      .select("title")
      .eq("deck_id", deckId)
      .order("order");

    const audience = await loadDeckAudience(supabase, deckId);

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: shareBlurbResultSchema,
      prompt: buildShareBlurbPrompt({
        deckName: deck.name,
        deckType: deck.type,
        slideTitles: (slides ?? []).map((s) => s.title),
        audience,
      }),
    });

    const metadata = (deck.metadata as Record<string, unknown>) ?? {};
    await supabase
      .from("decks")
      .update({
        metadata: { ...metadata, shareBlurb: object.blurb },
        updated_at: new Date().toISOString(),
      })
      .eq("id", deckId);

    await supabase
      .from("ai_generations")
      .update({ status: "completed", result: object })
      .eq("id", generationId);

    return object;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Share blurb failed";
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: message })
      .eq("id", generationId);
    throw err;
  }
}

export function shareBlurbPromptHash(deckId: string) {
  return createHash("sha256")
    .update(`share-blurb:${deckId}:${Date.now()}`)
    .digest("hex");
}
