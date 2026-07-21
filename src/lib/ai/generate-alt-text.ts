import { createHash } from "crypto";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildAltTextPrompt } from "@/lib/ai/prompts/alt-text";
import { altTextResultSchema } from "@/lib/ai/schemas/deck-ai";
import { createAdminClient } from "@/lib/supabase/admin";

export async function runGenerateAltText({
  deckId,
  slideId,
  generationId,
}: {
  deckId: string;
  slideId: string;
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

    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("*")
      .eq("id", slideId)
      .eq("deck_id", deckId)
      .single();

    if (slideError || !slide) throw new Error("Slide not found");

    const content = (slide.content as Record<string, unknown>) ?? {};
    if (!content.imagePath && !content.imageUrl) {
      throw new Error("Slide has no image to describe");
    }

    const slideContext = [
      slide.title,
      typeof content.body === "string" ? content.body : "",
      Array.isArray(content.bullets)
        ? (content.bullets as string[]).join("; ")
        : "",
    ]
      .filter(Boolean)
      .join(" — ");

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: altTextResultSchema,
      prompt: buildAltTextPrompt({
        slideTitle: slide.title,
        slideContext,
      }),
    });

    const mergedContent = { ...content, imageAlt: object.imageAlt };

    const { error } = await supabase
      .from("slides")
      .update({
        content: mergedContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slideId);

    if (error) throw new Error(error.message);

    const result = { slideId, imageAlt: object.imageAlt, content: mergedContent };

    await supabase
      .from("ai_generations")
      .update({ status: "completed", result })
      .eq("id", generationId);

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Alt text failed";
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: message })
      .eq("id", generationId);
    throw err;
  }
}

export function altTextPromptHash(slideId: string) {
  return createHash("sha256")
    .update(`alt-text:${slideId}:${Date.now()}`)
    .digest("hex");
}
