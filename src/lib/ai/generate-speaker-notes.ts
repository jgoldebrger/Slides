import { createHash } from "crypto";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { loadOrgAiTone } from "@/lib/ai/load-org-tone";
import { loadDeckAudience } from "@/lib/ai/load-deck-audience";
import { buildSpeakerNotesPrompt } from "@/lib/ai/prompts/speaker-notes";
import { speakerNotesResultSchema } from "@/lib/ai/schemas/deck-ai";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SlideLayout } from "@/types/slide";

export async function runGenerateSpeakerNotes({
  deckId,
  slideId,
  generationId,
  scope,
}: {
  deckId: string;
  slideId?: string;
  generationId: string;
  scope: "slide" | "deck";
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

    const aiTone = await loadOrgAiTone(supabase, deck.org_id);
    const audience = await loadDeckAudience(supabase, deckId);

    let query = supabase
      .from("slides")
      .select("id, title, layout, content, speaker_notes")
      .eq("deck_id", deckId)
      .order("order");

    if (scope === "slide" && slideId) {
      query = query.eq("id", slideId);
    }

    const { data: slides, error: slidesError } = await query;
    if (slidesError || !slides?.length) {
      throw new Error("No slides found");
    }

    const results: Array<{
      slideId: string;
      speakerNotes: string;
      talkingPoints: string[];
      questionsToAnticipate: string[];
    }> = [];

    for (const slide of slides) {
      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: speakerNotesResultSchema,
        prompt: buildSpeakerNotesPrompt({
          title: slide.title,
          layout: slide.layout as SlideLayout,
          content: slide.content,
          aiTone,
          audience,
        }),
      });

      const formattedNotes = [
        object.speakerNotes,
        object.talkingPoints.length
          ? `\nTalking points:\n${object.talkingPoints.map((p) => `• ${p}`).join("\n")}`
          : "",
        object.questionsToAnticipate.length
          ? `\nAnticipate:\n${object.questionsToAnticipate.map((q) => `• ${q}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      const { error } = await supabase
        .from("slides")
        .update({
          speaker_notes: formattedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", slide.id);

      if (error) throw new Error(error.message);

      results.push({
        slideId: slide.id,
        speakerNotes: formattedNotes,
        talkingPoints: object.talkingPoints,
        questionsToAnticipate: object.questionsToAnticipate,
      });
    }

    const result = { scope, slides: results };

    await supabase
      .from("ai_generations")
      .update({ status: "completed", result })
      .eq("id", generationId);

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Speaker notes failed";
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: message })
      .eq("id", generationId);
    throw err;
  }
}

export function speakerNotesPromptHash(deckId: string, slideId?: string) {
  return createHash("sha256")
    .update(`speaker-notes:${deckId}:${slideId ?? "deck"}:${Date.now()}`)
    .digest("hex");
}
