import { createHash } from "crypto";
import {
  buildVisualPromptFromSlide,
  editSlideImage,
  generateSlideImage,
  type VisualStyle,
} from "@/lib/ai/visuals";
import {
  buildAnnotatePolishEditPrompt,
  buildRefineEditPrompt,
} from "@/lib/ai/prompts/visuals";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedStorageUrl } from "@/lib/storage/images";

function slideContextFromContent(content: Record<string, unknown>) {
  return [
    content.body,
    Array.isArray(content.bullets)
      ? (content.bullets as string[]).join("; ")
      : null,
    Array.isArray(content.metrics)
      ? (content.metrics as { label: string; value: string }[])
          .map((m) => `${m.label}: ${m.value}`)
          .join("; ")
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

export async function runSlideVisualJob({
  deckId,
  slideId,
  generationId,
  mode,
  instructions,
  visualStyle,
  sourcePath,
  sourceMimeType,
  keepAnnotations,
}: {
  deckId: string;
  slideId: string;
  generationId: string;
  mode: "create" | "refine" | "annotate_polish";
  instructions?: string;
  visualStyle?: VisualStyle;
  sourcePath?: string;
  sourceMimeType?: string;
  keepAnnotations?: boolean;
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
      .select("org_id")
      .eq("id", deckId)
      .single();

    if (!deck) throw new Error("Deck not found");

    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("*")
      .eq("id", slideId)
      .eq("deck_id", deckId)
      .single();

    if (slideError || !slide) throw new Error("Slide not found");

    const slideContent = (slide.content as Record<string, unknown>) ?? {};
    const slideContext = slideContextFromContent(slideContent);
    const brandColors = await loadBrandColors(supabase, deck.org_id);
    const outputPath = `${deck.org_id}/${deckId}/${slideId}/visual-${crypto.randomUUID()}.png`;

    let generated: Buffer;
    if (mode === "refine" || mode === "annotate_polish") {
      if (!sourcePath) throw new Error("Source image required for refine");
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("slide-assets")
        .download(sourcePath);
      if (downloadError || !fileData) {
        throw new Error(downloadError?.message ?? "Failed to load source image");
      }
      const buffer = Buffer.from(await fileData.arrayBuffer());
      const mime = sourceMimeType ?? "image/png";

      if (mode === "annotate_polish") {
        const editPrompt = buildAnnotatePolishEditPrompt({
          slideTitle: slide.title,
          slideContext,
          userInstructions: instructions,
          keepAnnotations: keepAnnotations ?? false,
          brandColors,
        });
        generated = await editSlideImage({
          imageBytes: new Uint8Array(buffer),
          mimeType: mime,
          prompt: editPrompt,
          inputFidelity: "high",
        });
      } else {
        const editPrompt = buildRefineEditPrompt({
          slideTitle: slide.title,
          slideContext,
          userInstructions: instructions,
        });
        generated = await editSlideImage({
          imageBytes: new Uint8Array(buffer),
          mimeType: mime,
          prompt: editPrompt,
          inputFidelity: "high",
        });
      }
    } else {
      const dallePrompt = await buildVisualPromptFromSlide({
        slideTitle: slide.title,
        slideContext,
        slideLayout: slide.layout,
        userInstructions: instructions,
        visualStyle: visualStyle ?? "illustration",
        brandColors,
      });
      generated = await generateSlideImage(dallePrompt);
    }

    const { error: visualUploadError } = await supabase.storage
      .from("slide-assets")
      .upload(outputPath, generated, {
        contentType: "image/png",
        upsert: false,
      });

    if (visualUploadError) throw new Error(visualUploadError.message);

    await supabase.from("slide_assets").insert({
      slide_id: slideId,
      storage_path: outputPath,
      alt: slide.title,
      caption:
        instructions ??
        (mode === "annotate_polish"
          ? keepAnnotations
            ? "AI-polished annotated visual"
            : "AI-polished visual"
          : mode === "refine"
            ? "AI-refined visual"
            : `AI-generated ${visualStyle ?? "illustration"} visual`),
    });

    const updatedContent: Record<string, unknown> = {
      ...slideContent,
      imagePath: outputPath,
      imageAlt: slide.title,
    };
    if (sourcePath) updatedContent.sourceImagePath = sourcePath;

    const { error: updateError } = await supabase
      .from("slides")
      .update({
        content: updatedContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slideId);

    if (updateError) throw new Error(updateError.message);

    const imageUrl = await getSignedStorageUrl(
      supabase,
      "slide-assets",
      outputPath
    );

    const result = {
      slideId,
      imagePath: outputPath,
      imageUrl,
      layout: slide.layout,
    };

    await supabase
      .from("ai_generations")
      .update({ status: "completed", result })
      .eq("id", generationId);

    const { data: gen } = await supabase
      .from("ai_generations")
      .select("created_by")
      .eq("id", generationId)
      .single();

    if (gen?.created_by) {
      const { enqueueAutoAltText } = await import("@/lib/ai/run-narrate-deck");
      await enqueueAutoAltText({
        supabase,
        deckId,
        slideId,
        orgId: deck.org_id,
        userId: gen.created_by,
      });
    }

    return result;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Visual generation failed";
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: message })
      .eq("id", generationId);
    throw err;
  }
}

export function visualPromptHash(seed: string) {
  return createHash("sha256").update(seed).digest("hex");
}
