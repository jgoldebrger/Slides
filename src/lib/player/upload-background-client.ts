"use client";

import { getActionError } from "@/lib/action-result";
import {
  completeDeckBackgroundAudioUpload,
  completeDeckBackgroundImageUpload,
  prepareDeckBackgroundAudioUpload,
  prepareDeckBackgroundImageUpload,
} from "@/lib/actions/player";
import {
  validateBackgroundAudioFile,
  validateBackgroundImageFile,
} from "@/lib/player/background-upload";
import { createClient } from "@/lib/supabase/client";

/** Upload directly to Supabase Storage (bypasses Vercel's 4.5MB function body limit). */
export async function uploadBackgroundAudioClient(deckId: string, file: File) {
  const validated = validateBackgroundAudioFile(file);
  if ("error" in validated) return { error: validated.error };

  const prepared = await prepareDeckBackgroundAudioUpload(
    deckId,
    file.name,
    file.type,
    file.size
  );
  const prepError = getActionError(prepared);
  if (prepError) return { error: prepError };
  if (!("path" in prepared) || !prepared.path) return { error: "Upload failed" };
  const { path } = prepared;

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from("slide-assets")
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: true,
    });

  if (uploadError) {
    return { error: uploadError.message || "Upload failed" };
  }

  return completeDeckBackgroundAudioUpload(deckId, path);
}

export async function uploadBackgroundImageClient(deckId: string, file: File) {
  const validated = validateBackgroundImageFile(file);
  if ("error" in validated) return { error: validated.error };

  const prepared = await prepareDeckBackgroundImageUpload(
    deckId,
    file.name,
    file.type,
    file.size
  );
  const prepError = getActionError(prepared);
  if (prepError) return { error: prepError };
  if (!("path" in prepared) || !prepared.path) return { error: "Upload failed" };
  const { path } = prepared;

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from("slide-assets")
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: true,
    });

  if (uploadError) {
    return { error: uploadError.message || "Upload failed" };
  }

  return completeDeckBackgroundImageUpload(deckId, path);
}
