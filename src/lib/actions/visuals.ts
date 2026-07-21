"use server";

import { revalidatePath } from "next/cache";
import {
  isAllowedImageMime,
  type VisualStyle,
} from "@/lib/ai/visuals";
import {
  runSlideVisualJob,
  visualPromptHash,
} from "@/lib/ai/run-slide-visual";
import { assertDeckJobRateLimit } from "@/lib/deck-rate-limit";
import { requireDeckAccess, requireDeckEdit } from "@/lib/permissions";
import { scheduleBackgroundWork } from "@/lib/schedule-background";
import { getSignedStorageUrl } from "@/lib/storage/images";
import { actionError, toPublicError } from "@/lib/errors/public-error";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function validateImageFile(file: File | null) {
  if (!file || file.size === 0) return { error: "Upload an image" } as const;
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Image must be under 5MB" } as const;
  }
  if (!isAllowedImageMime(file.type)) {
    return { error: "Only PNG, JPEG, and WebP images are allowed" } as const;
  }
  return { file } as const;
}

async function uploadSlideImageSource({
  supabase,
  deck,
  deckId,
  slideId,
  file,
  prefix,
}: {
  supabase: Awaited<ReturnType<typeof requireDeckEdit>>["supabase"];
  deck: Awaited<ReturnType<typeof requireDeckEdit>>["deck"];
  deckId: string;
  slideId: string;
  file: File;
  prefix: string;
}) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const sourcePath = `${deck.org_id}/${deckId}/${slideId}/${prefix}-${crypto.randomUUID()}.${ext}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: sourceUploadError } = await supabase.storage
    .from("slide-assets")
    .upload(sourcePath, fileBuffer, { contentType: file.type, upsert: false });

  if (sourceUploadError) {
    throw sourceUploadError;
  }

  return { sourcePath, mimeType: file.type };
}

const VISUAL_STYLES = new Set<VisualStyle>([
  "illustration",
  "photo",
  "diagram",
  "chart",
  "abstract",
]);

type SlideVisualMode = "create" | "refine" | "annotate_polish";

async function enqueueSlideVisualJob({
  supabase,
  user,
  deck,
  deckId,
  slideId,
  mode,
  promptHashSeed,
  instructions,
  visualStyle,
  sourcePath,
  sourceMimeType,
  keepAnnotations,
}: {
  supabase: Awaited<ReturnType<typeof requireDeckEdit>>["supabase"];
  user: Awaited<ReturnType<typeof requireDeckEdit>>["user"];
  deck: Awaited<ReturnType<typeof requireDeckEdit>>["deck"];
  deckId: string;
  slideId: string;
  mode: SlideVisualMode;
  promptHashSeed: string;
  instructions?: string;
  visualStyle?: VisualStyle;
  sourcePath?: string;
  sourceMimeType?: string;
  keepAnnotations?: boolean;
}) {
  await assertDeckJobRateLimit(deck.org_id, "generate");

  const { data: genLog, error: genError } = await supabase
    .from("ai_generations")
    .insert({
      deck_id: deckId,
      org_id: deck.org_id,
      prompt_hash: visualPromptHash(promptHashSeed),
      model: "gpt-image-1",
      status: "pending",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (genError || !genLog) {
    return actionError("Failed to create generation job");
  }

  scheduleBackgroundWork(async () => {
    await runSlideVisualJob({
      deckId,
      slideId,
      generationId: genLog.id,
      mode,
      instructions,
      visualStyle,
      sourcePath,
      sourceMimeType,
      keepAnnotations,
    });
    revalidatePath(`/decks/${deckId}/editor`);
  });

  return {
    success: true as const,
    status: "processing" as const,
    generationId: genLog.id as string,
  };
}

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
    return await enqueueSlideVisualJob({
      supabase,
      user,
      deck,
      deckId,
      slideId,
      mode: "create",
      promptHashSeed: `${slideId}:create:${visualStyle}:${instructions ?? ""}`,
      instructions,
      visualStyle,
    });
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

  const validated = validateImageFile(file);
  if ("error" in validated) return { error: validated.error };
  const uploadFile = validated.file;

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
    const { sourcePath, mimeType } = await uploadSlideImageSource({
      supabase,
      deck,
      deckId,
      slideId,
      file: uploadFile,
      prefix: "source",
    });

    return await enqueueSlideVisualJob({
      supabase,
      user,
      deck,
      deckId,
      slideId,
      mode: "refine",
      promptHashSeed: `${slideId}:refine:${instructions ?? ""}`,
      instructions,
      sourcePath,
      sourceMimeType: mimeType,
    });
  } catch (err) {
    return actionError(toPublicError(err, "Visual generation failed"));
  }
}

/** Attach an image to a slide without AI (use as-is or after annotate). */
export async function attachSlideVisual(
  deckId: string,
  slideId: string,
  formData: FormData
) {
  const file = formData.get("file") as File | null;
  const validated = validateImageFile(file);
  if ("error" in validated) return { error: validated.error };
  const uploadFile = validated.file;

  const { supabase, deck } = await requireDeckEdit(deckId);

  const { data: slide, error: slideError } = await supabase
    .from("slides")
    .select("id, title, content")
    .eq("id", slideId)
    .eq("deck_id", deckId)
    .single();

  if (slideError || !slide) return { error: "Slide not found" };

  try {
    const { sourcePath } = await uploadSlideImageSource({
      supabase,
      deck,
      deckId,
      slideId,
      file: uploadFile,
      prefix: "visual",
    });

    const slideContent = (slide.content as Record<string, unknown>) ?? {};
    const previousPath = slideContent.imagePath as string | undefined;

    const updatedContent: Record<string, unknown> = {
      ...slideContent,
      imagePath: sourcePath,
      imageAlt: (slideContent.imageAlt as string | undefined) ?? slide.title,
    };
    if (previousPath && previousPath !== sourcePath) {
      updatedContent.sourceImagePath = previousPath;
    }

    const { error: updateError } = await supabase
      .from("slides")
      .update({
        content: updatedContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slideId);

    if (updateError) {
      return actionError(toPublicError(updateError, "Failed to update slide"));
    }

    await supabase.from("slide_assets").insert({
      slide_id: slideId,
      storage_path: sourcePath,
      alt: slide.title,
      caption: "Slide visual",
    });

    const imageUrl = await getSignedStorageUrl(
      supabase,
      "slide-assets",
      sourcePath
    );

    revalidatePath(`/decks/${deckId}/editor`);

    return {
      success: true as const,
      imagePath: sourcePath,
      imageUrl,
    };
  } catch (err) {
    return actionError(toPublicError(err, "Upload failed"));
  }
}

/** Upload annotated image and enqueue AI polish job. */
export async function polishAnnotatedVisual(
  deckId: string,
  slideId: string,
  formData: FormData
) {
  const file = formData.get("file") as File | null;
  const instructions = formData.get("instructions")?.toString().trim();
  const keepAnnotations = formData.get("keepAnnotations") === "true";

  const validated = validateImageFile(file);
  if ("error" in validated) return { error: validated.error };
  const uploadFile = validated.file;

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
    const { sourcePath, mimeType } = await uploadSlideImageSource({
      supabase,
      deck,
      deckId,
      slideId,
      file: uploadFile,
      prefix: "annotated",
    });

    return await enqueueSlideVisualJob({
      supabase,
      user,
      deck,
      deckId,
      slideId,
      mode: "annotate_polish",
      promptHashSeed: `${slideId}:annotate_polish:${keepAnnotations}:${instructions ?? ""}`,
      instructions,
      sourcePath,
      sourceMimeType: mimeType,
      keepAnnotations,
    });
  } catch (err) {
    return actionError(toPublicError(err, "Visual polish failed"));
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
