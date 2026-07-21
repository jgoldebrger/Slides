import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSpeechMp3, ttsCacheKey } from "@/lib/ai/tts";
import { normalizeAiTtsVoice, type AiTtsVoice } from "@/lib/ai/tts-voices";
import { buildSlideNarration } from "@/lib/slides/narration";
import { mapDbSlide } from "@/lib/slides/map-db-slide";

export async function runNarrateDeck({
  deckId,
  generationId,
  voice = "nova",
  speed = 1,
}: {
  deckId: string;
  generationId: string;
  voice?: AiTtsVoice;
  speed?: number;
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
      .select("org_id")
      .eq("id", deckId)
      .single();

    if (deckError || !deck) throw new Error("Deck not found");

    const { data: slides, error: slidesError } = await supabase
      .from("slides")
      .select("*")
      .eq("deck_id", deckId)
      .order("order");

    if (slidesError || !slides?.length) {
      throw new Error("No slides to narrate");
    }

    const normalizedVoice = normalizeAiTtsVoice(voice);
    const paths: string[] = [];

    for (const slide of slides) {
      const text = buildSlideNarration(mapDbSlide(slide));
      if (!text.trim()) continue;

      const path = ttsCacheKey({
        orgId: deck.org_id,
        deckId,
        voice: normalizedVoice,
        speed,
        text,
      });

      const existing = await supabase.storage.from("slide-assets").download(path);
      if (existing.error || !existing.data) {
        const mp3 = await generateSpeechMp3({
          text,
          voice: normalizedVoice,
          speed,
        });
        await supabase.storage.from("slide-assets").upload(path, mp3, {
          contentType: "audio/mpeg",
          upsert: true,
        });
      }

      paths.push(path);
    }

    const result = { slideCount: paths.length, paths, voice: normalizedVoice };

    await supabase
      .from("ai_generations")
      .update({ status: "completed", result })
      .eq("id", generationId);

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Narration failed";
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: message })
      .eq("id", generationId);
    throw err;
  }
}

export function narrateDeckPromptHash(deckId: string) {
  return createHash("sha256")
    .update(`narrate-deck:${deckId}:${Date.now()}`)
    .digest("hex");
}

export async function enqueueAutoAltText({
  supabase,
  deckId,
  slideId,
  orgId,
  userId,
}: {
  supabase: SupabaseClient;
  deckId: string;
  slideId: string;
  orgId: string;
  userId: string;
}) {
  if (!process.env.OPENAI_API_KEY) return;

  const { sendDeckEvent } = await import("@/lib/inngest/events");
  const { altTextPromptHash } = await import("@/lib/ai/generate-alt-text");

  const { data: genLog } = await supabase
    .from("ai_generations")
    .insert({
      deck_id: deckId,
      org_id: orgId,
      prompt_hash: altTextPromptHash(slideId),
      model: "gpt-4o-mini",
      status: "pending",
      created_by: userId,
    })
    .select("id")
    .single();

  if (!genLog?.id) return;

  try {
    await sendDeckEvent("deck/slide.alt-text", {
      deckId,
      slideId,
      userId,
      orgId,
      generationId: genLog.id,
    });
  } catch {
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: "Failed to enqueue alt text" })
      .eq("id", genLog.id);
  }
}
