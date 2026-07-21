"use server";

import { revalidatePath } from "next/cache";
import { requireDeckEdit } from "@/lib/permissions";
import { getSignedStorageUrl } from "@/lib/storage/images";
import { actionError, toPublicError } from "@/lib/errors/public-error";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"];
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function uploadDeckBackgroundAudio(deckId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file?.size) return { error: "No audio file provided" };
  if (file.size > MAX_AUDIO_BYTES) return { error: "Audio must be under 15MB" };
  if (!AUDIO_TYPES.includes(file.type)) {
    return { error: "Only MP3 or WAV audio is allowed" };
  }

  const { supabase, deck } = await requireDeckEdit(deckId);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
  const path = `${deck.org_id}/${deckId}/background/audio.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("slide-assets")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return actionError(toPublicError(uploadError, "Upload failed"));

  const { error } = await supabase
    .from("decks")
    .update({
      background_audio_path: path,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deckId);

  if (error) return actionError(toPublicError(error));

  const url = await getSignedStorageUrl(supabase, "slide-assets", path);
  revalidatePath(`/decks/${deckId}/player`);
  return { success: true, path, url };
}

export async function uploadDeckBackgroundImage(deckId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file?.size) return { error: "No image file provided" };
  if (file.size > MAX_IMAGE_BYTES) return { error: "Image must be under 5MB" };
  if (!IMAGE_TYPES.includes(file.type)) {
    return { error: "Only PNG, JPEG, and WebP images are allowed" };
  }

  const { supabase, deck } = await requireDeckEdit(deckId);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${deck.org_id}/${deckId}/background/image.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("slide-assets")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return actionError(toPublicError(uploadError, "Upload failed"));

  const { error } = await supabase
    .from("decks")
    .update({
      background_image_path: path,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deckId);

  if (error) return actionError(toPublicError(error));

  const url = await getSignedStorageUrl(supabase, "slide-assets", path);
  revalidatePath(`/decks/${deckId}/player`);
  return { success: true, path, url };
}

export async function clearDeckBackground(deckId: string, type: "audio" | "image") {
  const { supabase } = await requireDeckEdit(deckId);
  const field =
    type === "audio" ? "background_audio_path" : "background_image_path";

  const { error } = await supabase
    .from("decks")
    .update({ [field]: null, updated_at: new Date().toISOString() })
    .eq("id", deckId);

  if (error) return actionError(toPublicError(error));
  revalidatePath(`/decks/${deckId}/player`);
  return { success: true };
}
