import { createHash } from "crypto";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { loadOrgAiTone } from "@/lib/ai/load-org-tone";
import { buildRewriteSlidePrompt } from "@/lib/ai/prompts/rewrite";
import { slideFillSchemaForLayout } from "@/lib/ai/slide-content-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Slide, SlideLayout } from "@/types/slide";

export async function runRewriteSlide({
  deckId,
  slideId,
  generationId,
}: {
  deckId: string;
  slideId: string;
  userId: string;
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
      .select("org_id")
      .eq("id", deckId)
      .single();

    if (deckError || !deck) throw new Error("Deck not found");

    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("*")
      .eq("id", slideId)
      .eq("deck_id", deckId)
      .single();

    if (slideError || !slide) throw new Error("Slide not found");

    const aiTone = await loadOrgAiTone(supabase, deck.org_id);
    const layout = slide.layout as SlideLayout;
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: slideFillSchemaForLayout(layout),
      prompt: buildRewriteSlidePrompt({
        layout,
        title: slide.title,
        content: slide.content,
        aiTone,
      }),
    });

    const slideContent = (slide.content as Record<string, unknown>) ?? {};
    const preservedVisualFields = {
      imagePath: slideContent.imagePath,
      imageAlt: slideContent.imageAlt,
      sourceImagePath: slideContent.sourceImagePath,
      backgroundImagePath: slideContent.backgroundImagePath,
      backgroundImageUrl: slideContent.backgroundImageUrl,
    };

    const mergedContent = {
      ...object.content,
      ...Object.fromEntries(
        Object.entries(preservedVisualFields).filter(([, v]) => v != null)
      ),
    };

    const { error } = await supabase
      .from("slides")
      .update({
        title: object.title,
        content: mergedContent,
        speaker_notes: object.speakerNotes ?? slide.speaker_notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slideId);

    if (error) throw new Error(error.message);

    const result = {
      slideId,
      title: object.title,
      content: mergedContent as Slide["content"],
      speakerNotes: object.speakerNotes ?? slide.speaker_notes,
    };

    await supabase
      .from("ai_generations")
      .update({ status: "completed", result })
      .eq("id", generationId);

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rewrite failed";
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: message })
      .eq("id", generationId);
    throw err;
  }
}

export function rewritePromptHash(slideId: string) {
  return createHash("sha256")
    .update(`rewrite:${slideId}:${Date.now()}`)
    .digest("hex");
}
