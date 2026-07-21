import { createHash } from "crypto";
import {
  buildBackgroundImagePrompt,
  generateSlideImage,
  type BackgroundStyle,
} from "@/lib/ai/visuals";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedStorageUrl } from "@/lib/storage/images";

function slideContextFromContent(content: Record<string, unknown>) {
  return [
    content.body,
    Array.isArray(content.bullets)
      ? (content.bullets as string[]).join("; ")
      : null,
  ]
    .filter(Boolean)
    .join(" — ");
}

async function loadBrandColors(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string
) {
  const { data: brand } = await supabase
    .from("brand_kits")
    .select("primary_color, accent_color")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!brand?.primary_color || !brand?.accent_color) return undefined;
  return {
    primary: brand.primary_color,
    accent: brand.accent_color,
  };
}

async function loadDeckContext(
  supabase: ReturnType<typeof createAdminClient>,
  deckId: string,
  deckName: string
) {
  const { data: slides } = await supabase
    .from("slides")
    .select("title")
    .eq("deck_id", deckId)
    .order("order");

  const titles =
    slides
      ?.map((slide) => slide.title)
      .filter(Boolean)
      .join(", ") ?? "";

  return `${deckName}${titles ? `. Topics: ${titles}` : ""}`.slice(0, 500);
}

export async function runSlideBackgroundJob({
  deckId,
  slideId,
  generationId,
  scope,
  instructions,
  style,
  variationSeed,
}: {
  deckId: string;
  slideId?: string;
  generationId: string;
  scope: "slide" | "deck";
  instructions?: string;
  style: BackgroundStyle;
  variationSeed: string;
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

    const { data: deck } = await supabase
      .from("decks")
      .select("org_id, name")
      .eq("id", deckId)
      .single();

    if (!deck) throw new Error("Deck not found");

    const brandColors = await loadBrandColors(supabase, deck.org_id);
    let contextLabel: string;

    if (scope === "slide") {
      if (!slideId) throw new Error("slideId required for slide scope");
      const { data: slide, error } = await supabase
        .from("slides")
        .select("*")
        .eq("id", slideId)
        .eq("deck_id", deckId)
        .single();
      if (error || !slide) throw new Error("Slide not found");
      const slideContent = (slide.content as Record<string, unknown>) ?? {};
      contextLabel =
        `${slide.title}. ${slideContextFromContent(slideContent)}`.trim();
    } else {
      contextLabel = await loadDeckContext(supabase, deckId, deck.name);
    }

    const prompt = await buildBackgroundImagePrompt({
      contextLabel,
      userInstructions: instructions,
      brandColors,
      style,
      variationSeed,
    });

    const generated = await generateSlideImage(prompt);
    const path =
      scope === "deck"
        ? `${deck.org_id}/${deckId}/background/shared-${crypto.randomUUID()}.png`
        : `${deck.org_id}/${deckId}/${slideId}/background-${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("slide-assets")
      .upload(path, generated, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    const backgroundImageUrl = await getSignedStorageUrl(
      supabase,
      "slide-assets",
      path
    );
    const updatedAt = new Date().toISOString();

    if (scope === "deck") {
      const { data: slides, error: slidesError } = await supabase
        .from("slides")
        .select("id, content")
        .eq("deck_id", deckId);

      if (slidesError) throw new Error(slidesError.message);

      for (const slide of slides ?? []) {
        const slideContent = (slide.content as Record<string, unknown>) ?? {};
        const updatedContent: Record<string, unknown> = {
          ...slideContent,
          backgroundImagePath: path,
        };
        delete updatedContent.backgroundImageUrl;

        const { error } = await supabase
          .from("slides")
          .update({ content: updatedContent, updated_at: updatedAt })
          .eq("id", slide.id);
        if (error) throw new Error(error.message);
      }

      const { error: deckError } = await supabase
        .from("decks")
        .update({
          background_image_path: path,
          updated_at: updatedAt,
        })
        .eq("id", deckId);
      if (deckError) throw new Error(deckError.message);

      const result = {
        scope: "deck" as const,
        backgroundImagePath: path,
        backgroundImageUrl,
        appliedCount: slides?.length ?? 0,
      };

      await supabase
        .from("ai_generations")
        .update({ status: "completed", result })
        .eq("id", generationId);

      return result;
    }

    const { data: slide } = await supabase
      .from("slides")
      .select("content")
      .eq("id", slideId!)
      .single();

    const slideContent = (slide?.content as Record<string, unknown>) ?? {};
    const updatedContent: Record<string, unknown> = {
      ...slideContent,
      backgroundImagePath: path,
    };
    delete updatedContent.backgroundImageUrl;

    const { error: updateError } = await supabase
      .from("slides")
      .update({ content: updatedContent, updated_at: updatedAt })
      .eq("id", slideId!);
    if (updateError) throw new Error(updateError.message);

    const result = {
      scope: "slide" as const,
      slideId,
      backgroundImagePath: path,
      backgroundImageUrl,
      content: updatedContent,
    };

    await supabase
      .from("ai_generations")
      .update({ status: "completed", result })
      .eq("id", generationId);

    return result;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Background generation failed";
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: message })
      .eq("id", generationId);
    throw err;
  }
}

export function backgroundPromptHash(seed: string) {
  return createHash("sha256").update(seed).digest("hex");
}
