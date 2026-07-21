"use server";

import { revalidatePath } from "next/cache";
import { backgroundPromptHash } from "@/lib/ai/run-slide-background";
import { type BackgroundStyle, isAllowedImageMime } from "@/lib/ai/visuals";
import { assertDeckJobRateLimit } from "@/lib/deck-rate-limit";
import { applyDeckBackgroundBatch } from "@/lib/decks/slide-mutations";
import { sendDeckEvent } from "@/lib/inngest/events";
import { requireDeckEdit } from "@/lib/permissions";
import { getSignedStorageUrl } from "@/lib/storage/images";
import { toPublicError } from "@/lib/errors/public-error";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const BACKGROUND_STYLE_IDS = new Set<BackgroundStyle>([
  "gradient",
  "geometric",
  "mesh",
  "organic",
  "minimal",
  "dark",
  "warm",
]);

function parseBackgroundStyle(value: FormDataEntryValue | null): BackgroundStyle {
  const style = value?.toString() ?? "gradient";
  return BACKGROUND_STYLE_IDS.has(style as BackgroundStyle)
    ? (style as BackgroundStyle)
    : "gradient";
}

async function persistSlideBackground({
  supabase,
  deckId,
  slideId,
  slide,
  backgroundPath,
}: {
  supabase: Awaited<ReturnType<typeof requireDeckEdit>>["supabase"];
  deckId: string;
  slideId: string;
  slide: { content: unknown };
  backgroundPath: string | null;
}) {
  const slideContent = (slide.content as Record<string, unknown>) ?? {};
  const updatedContent = { ...slideContent };

  if (backgroundPath) {
    updatedContent.backgroundImagePath = backgroundPath;
    delete updatedContent.backgroundImageUrl;
  } else {
    delete updatedContent.backgroundImagePath;
    delete updatedContent.backgroundImageUrl;
  }

  const { error } = await supabase
    .from("slides")
    .update({
      content: updatedContent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", slideId)
    .eq("deck_id", deckId);

  if (error) return { error: "Could not update slide background" };

  const backgroundImageUrl = backgroundPath
    ? await getSignedStorageUrl(supabase, "slide-assets", backgroundPath)
    : null;

  revalidatePath(`/decks/${deckId}/editor`);
  revalidatePath(`/decks/${deckId}/player`);

  return {
    success: true as const,
    backgroundImagePath: backgroundPath ?? undefined,
    backgroundImageUrl,
    content: updatedContent,
  };
}

async function applyBackgroundPathToAllSlides({
  supabase,
  deckId,
  backgroundPath,
}: {
  supabase: Awaited<ReturnType<typeof requireDeckEdit>>["supabase"];
  deckId: string;
  backgroundPath: string | null;
}) {
  try {
    await applyDeckBackgroundBatch({
      supabase,
      deckId,
      backgroundPath,
    });
  } catch (err) {
    return { error: toPublicError(err, "Could not update slide backgrounds") };
  }

  const backgroundImageUrl = backgroundPath
    ? await getSignedStorageUrl(supabase, "slide-assets", backgroundPath)
    : null;

  const { count } = await supabase
    .from("slides")
    .select("id", { count: "exact", head: true })
    .eq("deck_id", deckId);

  revalidatePath(`/decks/${deckId}/editor`);
  revalidatePath(`/decks/${deckId}/player`);

  return {
    success: true as const,
    backgroundImagePath: backgroundPath ?? undefined,
    backgroundImageUrl,
    appliedCount: count ?? 0,
  };
}

export async function applyBackgroundToAllSlides(
  deckId: string,
  sourceSlideId: string
) {
  const { supabase } = await requireDeckEdit(deckId);

  const { data: slide, error: slideError } = await supabase
    .from("slides")
    .select("content")
    .eq("id", sourceSlideId)
    .eq("deck_id", deckId)
    .single();

  if (slideError || !slide) return { error: "Slide not found" };

  const slideContent = (slide.content as Record<string, unknown>) ?? {};
  const backgroundPath =
    typeof slideContent.backgroundImagePath === "string"
      ? slideContent.backgroundImagePath
      : null;

  if (!backgroundPath) {
    return { error: "This slide has no background to apply" };
  }

  return applyBackgroundPathToAllSlides({
    supabase,
    deckId,
    backgroundPath,
  });
}

export async function uploadSlideBackground(
  deckId: string,
  slideId: string,
  formData: FormData
) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a background image" };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Image must be under 5MB" };
  }
  if (!isAllowedImageMime(file.type)) {
    return { error: "Only PNG, JPEG, and WebP images are allowed" };
  }

  const { supabase, deck } = await requireDeckEdit(deckId);

  const { data: slide, error: slideError } = await supabase
    .from("slides")
    .select("*")
    .eq("id", slideId)
    .eq("deck_id", deckId)
    .single();

  if (slideError || !slide) return { error: "Slide not found" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${deck.org_id}/${deckId}/${slideId}/background-${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("slide-assets")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return { error: toPublicError(uploadError, "Upload failed") };

  return persistSlideBackground({
    supabase,
    deckId,
    slideId,
    slide,
    backgroundPath: path,
  });
}

export async function uploadDeckBackgroundForAll(
  deckId: string,
  formData: FormData
) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Choose a background image" };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Image must be under 5MB" };
  }
  if (!isAllowedImageMime(file.type)) {
    return { error: "Only PNG, JPEG, and WebP images are allowed" };
  }

  const { supabase, deck } = await requireDeckEdit(deckId);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${deck.org_id}/${deckId}/background/shared-${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("slide-assets")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return { error: toPublicError(uploadError, "Upload failed") };

  return applyBackgroundPathToAllSlides({
    supabase,
    deckId,
    backgroundPath: path,
  });
}

export async function createSlideBackground(
  deckId: string,
  slideId: string,
  formData: FormData
) {
  const instructions = formData.get("instructions")?.toString().trim();
  const style = parseBackgroundStyle(formData.get("style"));
  const variationSeed = crypto.randomUUID();

  const { supabase, user, deck } = await requireDeckEdit(deckId);

  const { data: slide, error: slideError } = await supabase
    .from("slides")
    .select("id")
    .eq("id", slideId)
    .eq("deck_id", deckId)
    .single();

  if (slideError || !slide) return { error: "Slide not found" };

  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY is not configured" };
  }

  try {
    await assertDeckJobRateLimit(deck.org_id, "generate");

    const { data: genLog, error: genError } = await supabase
      .from("ai_generations")
      .insert({
        deck_id: deckId,
        org_id: deck.org_id,
        prompt_hash: backgroundPromptHash(
          `${slideId}:bg:${style}:${instructions ?? ""}:${variationSeed}`
        ),
        model: "gpt-image-1",
        status: "pending",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (genError || !genLog) {
      return { error: "Failed to create generation job" };
    }

    await sendDeckEvent("deck/slide.background", {
      deckId,
      slideId,
      orgId: deck.org_id,
      generationId: genLog.id,
      scope: "slide",
      instructions,
      style,
      variationSeed,
    });

    return {
      success: true as const,
      status: "processing" as const,
      generationId: genLog.id as string,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Background generation failed";
    return { error: message };
  }
}

export async function createDeckBackground(deckId: string, formData: FormData) {
  const instructions = formData.get("instructions")?.toString().trim();
  const style = parseBackgroundStyle(formData.get("style"));
  const variationSeed = crypto.randomUUID();

  const { supabase, user, deck } = await requireDeckEdit(deckId);

  if (!process.env.OPENAI_API_KEY) {
    return { error: "OPENAI_API_KEY is not configured" };
  }

  try {
    await assertDeckJobRateLimit(deck.org_id, "generate");

    const { data: genLog, error: genError } = await supabase
      .from("ai_generations")
      .insert({
        deck_id: deckId,
        org_id: deck.org_id,
        prompt_hash: backgroundPromptHash(
          `${deckId}:deck-bg:${style}:${instructions ?? ""}:${variationSeed}`
        ),
        model: "gpt-image-1",
        status: "pending",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (genError || !genLog) {
      return { error: "Failed to create generation job" };
    }

    await sendDeckEvent("deck/slide.background", {
      deckId,
      orgId: deck.org_id,
      generationId: genLog.id,
      scope: "deck",
      instructions,
      style,
      variationSeed,
    });

    return {
      success: true as const,
      status: "processing" as const,
      generationId: genLog.id as string,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Background generation failed";
    return { error: message };
  }
}

export async function clearSlideBackground(deckId: string, slideId: string) {
  const { supabase } = await requireDeckEdit(deckId);

  const { data: slide, error: slideError } = await supabase
    .from("slides")
    .select("*")
    .eq("id", slideId)
    .eq("deck_id", deckId)
    .single();

  if (slideError || !slide) return { error: "Slide not found" };

  return persistSlideBackground({
    supabase,
    deckId,
    slideId,
    slide,
    backgroundPath: null,
  });
}

export async function clearDeckBackgroundAll(deckId: string) {
  const { supabase } = await requireDeckEdit(deckId);

  return applyBackgroundPathToAllSlides({
    supabase,
    deckId,
    backgroundPath: null,
  });
}
