/** Shared validation for deck player background uploads. */

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
] as const;

export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

function extensionFromName(fileName: string): string | undefined {
  return fileName.split(".").pop()?.toLowerCase();
}

export function isAllowedAudioFile(file: Pick<File, "type" | "name">): boolean {
  if (AUDIO_MIME_TYPES.includes(file.type as (typeof AUDIO_MIME_TYPES)[number])) {
    return true;
  }
  const ext = extensionFromName(file.name);
  return ext === "mp3" || ext === "wav";
}

export function isAllowedImageFile(file: Pick<File, "type" | "name">): boolean {
  if (IMAGE_MIME_TYPES.includes(file.type as (typeof IMAGE_MIME_TYPES)[number])) {
    return true;
  }
  const ext = extensionFromName(file.name);
  return ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp";
}

export function validateBackgroundAudioFile(file: File | null) {
  if (!file?.size) return { error: "No audio file provided" } as const;
  if (file.size > MAX_AUDIO_BYTES) {
    return { error: "Audio must be under 15MB" } as const;
  }
  if (!isAllowedAudioFile(file)) {
    return { error: "Only MP3 or WAV audio is allowed" } as const;
  }
  return { file } as const;
}

export function validateBackgroundImageFile(file: File | null) {
  if (!file?.size) return { error: "No image file provided" } as const;
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Image must be under 5MB" } as const;
  }
  if (!isAllowedImageFile(file)) {
    return { error: "Only PNG, JPEG, and WebP images are allowed" } as const;
  }
  return { file } as const;
}

export function deckBackgroundAudioPath(
  orgId: string,
  deckId: string,
  fileName: string
) {
  const ext = extensionFromName(fileName) === "wav" ? "wav" : "mp3";
  return `${orgId}/${deckId}/background/audio.${ext}`;
}

export function deckBackgroundImagePath(
  orgId: string,
  deckId: string,
  fileName: string
) {
  const ext = extensionFromName(fileName) ?? "jpg";
  const normalized =
    ext === "jpeg" ? "jpg" : ["png", "jpg", "webp"].includes(ext) ? ext : "jpg";
  return `${orgId}/${deckId}/background/image.${normalized}`;
}

export function isDeckBackgroundStoragePath(
  orgId: string,
  deckId: string,
  path: string,
  kind: "audio" | "image"
) {
  const prefix = `${orgId}/${deckId}/background/`;
  if (!path.startsWith(prefix)) return false;
  if (kind === "audio") {
    return path.endsWith(".mp3") || path.endsWith(".wav");
  }
  return path.endsWith(".png") || path.endsWith(".jpg") || path.endsWith(".webp");
}
