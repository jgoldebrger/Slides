"use server";

import { revalidatePath } from "next/cache";
import { requireDeckEdit } from "@/lib/permissions";
import {
  deckBackgroundAudioPath,
  deckBackgroundImagePath,
  isDeckBackgroundStoragePath,
  validateBackgroundAudioFile,
  validateBackgroundImageFile,
} from "@/lib/player/background-upload";
import { getSignedStorageUrl } from "@/lib/storage/images";
import { actionError, toPublicError } from "@/lib/errors/public-error";

export async function prepareDeckBackgroundAudioUpload(
  deckId: string,
  fileName: string,
  contentType: string,
  size: number
) {
  const validated = validateBackgroundAudioFile({
    name: fileName,
    type: contentType,
    size,
  } as File);
  if ("error" in validated) return { error: validated.error };

  const { deck } = await requireDeckEdit(deckId);
  const path = deckBackgroundAudioPath(deck.org_id, deckId, fileName);
  return { success: true as const, path };
}

export async function completeDeckBackgroundAudioUpload(
  deckId: string,
  path: string
) {
  const { supabase, deck } = await requireDeckEdit(deckId);
  if (!isDeckBackgroundStoragePath(deck.org_id, deckId, path, "audio")) {
    return { error: "Invalid storage path" };
  }

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
  return { success: true as const, path, url };
}

export async function prepareDeckBackgroundImageUpload(
  deckId: string,
  fileName: string,
  contentType: string,
  size: number
) {
  const validated = validateBackgroundImageFile({
    name: fileName,
    type: contentType,
    size,
  } as File);
  if ("error" in validated) return { error: validated.error };

  const { deck } = await requireDeckEdit(deckId);
  const path = deckBackgroundImagePath(deck.org_id, deckId, fileName);
  return { success: true as const, path };
}

export async function completeDeckBackgroundImageUpload(
  deckId: string,
  path: string
) {
  const { supabase, deck } = await requireDeckEdit(deckId);
  if (!isDeckBackgroundStoragePath(deck.org_id, deckId, path, "image")) {
    return { error: "Invalid storage path" };
  }

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
  return { success: true as const, path, url };
}

/** @deprecated Use uploadBackgroundAudioClient — Vercel limits request bodies to 4.5MB. */
export async function uploadDeckBackgroundAudio(deckId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  const validated = validateBackgroundAudioFile(file);
  if ("error" in validated) return { error: validated.error };

  const prepared = await prepareDeckBackgroundAudioUpload(
    deckId,
    validated.file.name,
    validated.file.type,
    validated.file.size
  );
  if ("error" in prepared) return prepared;
  if (!("path" in prepared)) return { error: "Upload failed" };

  const { supabase } = await requireDeckEdit(deckId);
  const buffer = Buffer.from(await validated.file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("slide-assets")
    .upload(prepared.path, buffer, {
      contentType: validated.file.type,
      upsert: true,
    });

  if (uploadError) return actionError(toPublicError(uploadError, "Upload failed"));
  return completeDeckBackgroundAudioUpload(deckId, prepared.path);
}

/** @deprecated Use uploadBackgroundImageClient — Vercel limits request bodies to 4.5MB. */
export async function uploadDeckBackgroundImage(deckId: string, formData: FormData) {
  const file = formData.get("file") as File | null;
  const validated = validateBackgroundImageFile(file);
  if ("error" in validated) return { error: validated.error };

  const prepared = await prepareDeckBackgroundImageUpload(
    deckId,
    validated.file.name,
    validated.file.type,
    validated.file.size
  );
  if ("error" in prepared) return prepared;
  if (!("path" in prepared)) return { error: "Upload failed" };

  const { supabase } = await requireDeckEdit(deckId);
  const buffer = Buffer.from(await validated.file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("slide-assets")
    .upload(prepared.path, buffer, {
      contentType: validated.file.type,
      upsert: true,
    });

  if (uploadError) return actionError(toPublicError(uploadError, "Upload failed"));
  return completeDeckBackgroundImageUpload(deckId, prepared.path);
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
