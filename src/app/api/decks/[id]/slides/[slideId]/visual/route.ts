import { NextResponse } from "next/server";
import { apiError, handleApiError } from "@/lib/api/response";
import { requireDeckAccess } from "@/lib/permissions";

function mimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "image/png";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; slideId: string }> }
) {
  try {
    const { id: deckId, slideId } = await params;
    const { supabase } = await requireDeckAccess(deckId);

    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("content")
      .eq("id", slideId)
      .eq("deck_id", deckId)
      .single();

    if (slideError || !slide) {
      return apiError("Slide not found", 404, "not_found");
    }

    const content = (slide.content as Record<string, unknown>) ?? {};
    const imagePath = content.imagePath;
    if (typeof imagePath !== "string" || !imagePath.trim()) {
      return apiError("No slide image", 404, "not_found");
    }

    const { data, error: downloadError } = await supabase.storage
      .from("slide-assets")
      .download(imagePath);

    if (downloadError || !data) {
      return apiError("Image not found", 404, "not_found");
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeFromPath(imagePath),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
