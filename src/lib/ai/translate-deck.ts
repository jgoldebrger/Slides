import { createHash } from "crypto";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildTranslateSlidePrompt } from "@/lib/ai/prompts/translate";
import {
  slideTranslationSchema,
  type TranslateLanguage,
} from "@/lib/ai/schemas/translate";
import { snapshotDeckSlides } from "@/lib/decks/revisions";
import { applySlideContentBatch } from "@/lib/decks/slide-mutations";

export async function runTranslateDeck({
  deckId,
  userId,
  generationId,
  language,
}: {
  deckId: string;
  userId: string;
  generationId: string;
  language: TranslateLanguage;
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
      .select("*")
      .eq("id", deckId)
      .single();

    if (deckError || !deck) throw new Error("Deck not found");

    const { data: slides, error: slidesError } = await supabase
      .from("slides")
      .select("id, title, content, speaker_notes")
      .eq("deck_id", deckId)
      .order("order");

    if (slidesError || !slides?.length) {
      throw new Error("No slides to translate");
    }

    await snapshotDeckSlides({
      supabase,
      deckId,
      orgId: deck.org_id,
      userId,
      reason: "translate",
    });

    const batch: Array<{
      id: string;
      title: string;
      content: Record<string, unknown>;
      speaker_notes: string;
    }> = [];

    for (const slide of slides) {
      const content = (slide.content as Record<string, unknown>) ?? {};
      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: slideTranslationSchema,
        prompt: buildTranslateSlidePrompt({
          language,
          title: slide.title,
          content,
          speakerNotes: slide.speaker_notes ?? "",
        }),
      });

      batch.push({
        id: slide.id,
        title: object.title,
        content: object.content as Record<string, unknown>,
        speaker_notes: object.speakerNotes,
      });
    }

    await applySlideContentBatch({ supabase, deckId, updates: batch });

    const metadata = (deck.metadata as Record<string, unknown>) ?? {};
    await supabase
      .from("decks")
      .update({
        metadata: { ...metadata, translatedLanguage: language },
        updated_at: new Date().toISOString(),
      })
      .eq("id", deckId);

    const result = { language, slideCount: slides.length };

    await supabase
      .from("ai_generations")
      .update({ status: "completed", result })
      .eq("id", generationId);

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Translation failed";
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: message })
      .eq("id", generationId);
    throw err;
  }
}

export function translateDeckPromptHash(deckId: string, language: string) {
  return createHash("sha256")
    .update(`translate:${deckId}:${language}:${Date.now()}`)
    .digest("hex");
}
