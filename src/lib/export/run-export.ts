import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolveBrandThemeFromKit,
  UNBRANDED_PREVIEW_THEME,
} from "@/lib/brand";
import { sendExportReadyEmail } from "@/lib/email/send-export-ready";
import { generateExportArtifact } from "@/lib/export/format-registry";
import { getSignedStorageUrl, resolveSlideBackgroundUrl, resolveSlideImageUrl } from "@/lib/storage/images";
import { mapDbSlide } from "@/lib/slides/map-db-slide";
import type { Slide } from "@/types/slide";

export async function runExport(exportId: string, deckId: string) {
  const supabase = createAdminClient();

  const { data: exportRow } = await supabase
    .from("exports")
    .select("*")
    .eq("id", exportId)
    .single();

  if (!exportRow) {
    throw new Error("Export not found");
  }

  // Idempotent retries: already completed → skip regenerate/email
  if (exportRow.status === "completed" && exportRow.storage_path) {
    return {
      success: true,
      exportId,
      path: exportRow.storage_path as string,
      alreadyDone: true,
    };
  }

  const { data: deck } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .single();

  if (!deck) {
    throw new Error("Deck not found");
  }

  try {
    const { data: slides } = await supabase
      .from("slides")
      .select("*")
      .eq("deck_id", deckId)
      .order("order");

    const { data: brand } = await supabase
      .from("brand_kits")
      .select("*")
      .eq("org_id", deck.org_id)
      .single();

    const theme = deck.apply_branding
      ? resolveBrandThemeFromKit(brand)
      : UNBRANDED_PREVIEW_THEME;

    const logoUrl =
      deck.apply_branding && brand?.logo_path
        ? await getSignedStorageUrl(supabase, "brand-logos", brand.logo_path)
        : null;

    const deckBackgroundUrl = deck.background_image_path
      ? await getSignedStorageUrl(supabase, "slide-assets", deck.background_image_path)
      : null;

    const mappedSlides: Slide[] = await Promise.all(
      (slides ?? []).map(async (s) => {
        const mapped = mapDbSlide(s);
        const content = mapped.content;
        const imageUrl = await resolveSlideImageUrl(supabase, content);
        const backgroundImageUrl = await resolveSlideBackgroundUrl(
          supabase,
          content
        );
        return {
          ...mapped,
          content: {
            ...content,
            imageUrl: imageUrl ?? content.imageUrl,
            backgroundImageUrl:
              backgroundImageUrl ??
              content.backgroundImageUrl ??
              deckBackgroundUrl ??
              undefined,
          },
        };
      })
    );

    const artifact = await generateExportArtifact(
      exportRow.format ?? "pptx",
      mappedSlides,
      deck.name,
      theme,
      {
        branded: deck.apply_branding ?? false,
        logoUrl,
      }
    );

    const path = `${deck.org_id}/${deckId}/${exportId}.${artifact.extension}`;

    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(path, artifact.buffer, {
        contentType: artifact.contentType,
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: completed, error: completeError } = await supabase
      .from("exports")
      .update({
        status: "completed",
        storage_path: path,
        updated_at: new Date().toISOString(),
      })
      .eq("id", exportId)
      .in("status", ["processing", "pending"])
      .select("id, created_by, notified_at")
      .maybeSingle();

    if (completeError) throw new Error(completeError.message);

    // Another worker already completed — skip email
    if (!completed) {
      return { success: true, exportId, path, alreadyDone: true };
    }

    if (completed.created_by && !completed.notified_at) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("notify_export_ready")
        .eq("id", completed.created_by)
        .maybeSingle();

      if (profile?.notify_export_ready !== false) {
        const { data: userData } = await supabase.auth.admin.getUserById(
          completed.created_by
        );
        const email = userData?.user?.email;

        if (email) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
          await sendExportReadyEmail({
            to: email,
            deckName: deck.name,
            exportUrl: `${appUrl}/decks/${deckId}/export`,
          });
        }
      }

      await supabase
        .from("exports")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", exportId)
        .is("notified_at", null);
    }

    return { success: true, exportId, path };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    await supabase
      .from("exports")
      .update({
        status: "failed",
        error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", exportId);
    throw err;
  }
}
