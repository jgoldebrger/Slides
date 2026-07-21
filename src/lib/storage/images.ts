import type { SupabaseClient } from "@supabase/supabase-js";

type StorageBucket = "slide-assets" | "screenshots" | "brand-logos";

export async function getSignedStorageUrl(
  supabase: SupabaseClient,
  bucket: StorageBucket,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function resolveSlideImageUrl(
  supabase: SupabaseClient,
  content: { imageUrl?: string; imagePath?: string }
): Promise<string | undefined> {
  if (content.imagePath) {
    const signed = await getSignedStorageUrl(
      supabase,
      "slide-assets",
      content.imagePath
    );
    return signed ?? undefined;
  }
  return content.imageUrl;
}

export async function resolveSlideBackgroundUrl(
  supabase: SupabaseClient,
  content: { backgroundImageUrl?: string; backgroundImagePath?: string }
): Promise<string | undefined> {
  if (content.backgroundImagePath) {
    const signed = await getSignedStorageUrl(
      supabase,
      "slide-assets",
      content.backgroundImagePath
    );
    return signed ?? undefined;
  }
  return content.backgroundImageUrl;
}
