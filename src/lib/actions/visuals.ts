"use server";

import { revalidatePath } from "next/cache";
import {
  isAllowedImageMime,
  type VisualStyle,
} from "@/lib/ai/visuals";
import { visualPromptHash } from "@/lib/ai/run-slide-visual";
import { sendDeckEvent } from "@/lib/inngest/events";
import { assertDeckJobRateLimit } from "@/lib/deck-rate-limit";
import { requireDeckAccess, requireDeckEdit } from "@/lib/permissions";
import { getSignedStorageUrl } from "@/lib/storage/images";
import { actionError, toPublicError } from "@/lib/errors/public-error";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const VISUAL_STYLES = new Set<VisualStyle>([
  "illustration",
  "photo",
  "diagram",
  "chart",
  "abstract",
]);

/** Enqueues AI visual creation; poll with pollAiGeneration. */
export async function createSlideVisual(
  deckId: string,
  slideId: string,
  formData: FormData
) {
  const instructions = formData.get("instructions")?.toString().trim();
  const styleRaw = formData.get("style")?.toString() ?? "illustration";
  const visualStyle = VISUAL_STYLES.has(styleRaw as VisualStyle)
    ? (styleRaw as VisualStyle)
    : "illustration";

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
        prompt_hash: visualPromptHash(
          `${slideId}:create:${visualStyle}:${instructions ?? ""}`
        ),
        model: "gpt-image-1",
        status: "pending",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (genError || !genLog) {
      return actionError("Failed to create generation job");
    }

    await sendDeckEvent("deck/slide.visual", {
      deckId,
      slideId,
      orgId: deck.org_id,
      generationId: genLog.id,
      mode: "create",
      instructions,
      visualStyle,
    });

    return {
      success: true as const,
      status: "processing" as const,
      generationId: genLog.id as string,
    };
  } catch (err) {
    return actionError(toPublicError(err, "Visual generation failed"));
  }
}

/** Uploads source image sync, then enqueues refine job. */
export async function finishSlideVisual(
  deckId: string,
  slideId: string,
  formData: FormData
) {
  const file = formData.get("file") as File | null;
  const instructions = formData.get("instructions")?.toString().trim();

  if (!file || file.size === 0) return { error: "Upload an image to refine" };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Image must be under 5MB" };
  }
  if (!isAllowedImageMime(file.type)) {
    return { error: "Only PNG, JPEG, and WebP images are allowed" };
  }

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

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const sourcePath = `${deck.org_id}/${deckId}/${slideId}/source-${crypto.randomUUID()}.${ext}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: sourceUploadError } = await supabase.storage
    .from("slide-assets")
    .upload(sourcePath, fileBuffer, { contentType: file.type, upsert: false });

  if (sourceUploadError) {
    return actionError(toPublicError(sourceUploadError, "Upload failed"));
  }

  try {
    await assertDeckJobRateLimit(deck.org_id, "generate");

    const { data: genLog, error: genError } = await supabase
      .from("ai_generations")
      .insert({
        deck_id: deckId,
        org_id: deck.org_id,
        prompt_hash: visualPromptHash(
          `${slideId}:refine:${instructions ?? ""}`
        ),
        model: "gpt-image-1",
        status: "pending",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (genError || !genLog) {
      return actionError("Failed to create generation job");
    }

    await sendDeckEvent("deck/slide.visual", {
      deckId,
      slideId,
      orgId: deck.org_id,
      generationId: genLog.id,
      mode: "refine",
      instructions,
      sourcePath,
      sourceMimeType: file.type,
    });

    return {
      success: true as const,
      status: "processing" as const,
      generationId: genLog.id as string,
    };
  } catch (err) {
    return actionError(toPublicError(err, "Visual generation failed"));
  }
}

export async function getSlideVisualUrl(deckId: string, imagePath: string) {
  const { supabase } = await requireDeckAccess(deckId);
  const url = await getSignedStorageUrl(supabase, "slide-assets", imagePath);
  if (!url) return { error: "Could not load image" };
  return { url };
}

export async function revalidateEditor(deckId: string) {
  revalidatePath(`/decks/${deckId}/editor`);
  return { success: true as const };
}
