import { NextResponse } from "next/server";
import { z } from "zod";
import { saveDeferredQuestion } from "@/lib/ai/present/player-defer";
import { answerPlayerQuestion } from "@/lib/ai/present/player-qa";
import { apiError, handleApiError } from "@/lib/api/response";
import { assertOrgCanUsePaidFeatures } from "@/lib/billing/entitlements";
import { PublicError } from "@/lib/errors/public-error";
import { assertRateLimit } from "@/lib/rate-limit";
import { authorizeDeckAccess } from "@/lib/share/authorize-deck-access";
import { mapDbSlide } from "@/lib/slides/map-db-slide";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  question: z.string().trim().min(1).max(500),
  shareToken: z.string().min(16).max(200),
  viewerEmail: z.string().trim().email().max(320).optional(),
});

function accessErrorResponse(error: unknown) {
  const status =
    error instanceof Error && "status" in error
      ? Number((error as { status: number }).status)
      : 403;
  return apiError(
    error instanceof Error ? error.message : "Share link unavailable",
    status,
    status === 401 ? "unauthorized" : "forbidden"
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deckId } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return apiError("Enter a valid question and optional email address.", 400);
    }

    const { question, shareToken, viewerEmail } = parsed.data;
    let orgId: string;
    let shareLinkId: string | undefined;
    try {
      ({ orgId, shareLinkId } = await authorizeDeckAccess(deckId, shareToken));
    } catch (error) {
      return accessErrorResponse(error);
    }

    const admin = createAdminClient();
    try {
      await assertOrgCanUsePaidFeatures(admin, orgId);
      await assertRateLimit(orgId, "player");
    } catch (error) {
      if (error instanceof PublicError) {
        return apiError(error.message, 402, "payment_required");
      }
      throw error;
    }

    const [
      { data: slideRows, error: slidesError },
      { data: deck, error: deckError },
    ] = await Promise.all([
      admin.from("slides").select("*").eq("deck_id", deckId).order("order"),
      admin.from("decks").select("project_id").eq("id", deckId).maybeSingle(),
    ]);

    if (slidesError || deckError || !deck) {
      throw new Error("Could not load the presentation context");
    }

    let updates: Record<string, unknown> = {};
    if (deck.project_id) {
      const { data: updateRow, error: updateError } = await admin
        .from("project_updates")
        .select("*")
        .eq("project_id", deck.project_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (updateError) throw new Error("Could not load the project context");
      if (updateRow) updates = updateRow as Record<string, unknown>;
    }

    const slides = (slideRows ?? []).map((row) => {
      const slide = mapDbSlide(row);
      return { title: slide.title, content: slide.content };
    });
    const result = await answerPlayerQuestion({ question, slides, updates });

    if (result.type === "deferred" && shareLinkId) {
      await saveDeferredQuestion({
        supabase: admin,
        orgId,
        deckId,
        shareLinkId,
        question,
        viewerEmail,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
