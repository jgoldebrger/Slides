import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateNarrationMp3 } from "@/lib/ai/tts";
import { AI_TTS_VOICES, normalizeAiTtsVoice } from "@/lib/ai/tts-voices";
import { apiError, handleApiError } from "@/lib/api/response";
import { assertOrgCanUsePaidFeatures } from "@/lib/billing/entitlements";
import { PublicError } from "@/lib/errors/public-error";
import { assertRateLimit } from "@/lib/rate-limit";
import { buildSlideNarration } from "@/lib/slides/narration";
import { mapDbSlide } from "@/lib/slides/map-db-slide";
import { hashShareToken } from "@/lib/share/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  slideId: z.string().uuid(),
  voice: z.enum(AI_TTS_VOICES).optional(),
  speed: z.number().min(0.25).max(4).optional(),
  shareToken: z.string().min(16).max(200).optional(),
});

async function authorizeDeckAccess(
  deckId: string,
  shareToken?: string
): Promise<{ orgId: string }> {
  if (shareToken) {
    const tokenHash = hashShareToken(shareToken);
    const admin = createAdminClient();
    const { data: link } = await admin
      .from("deck_share_links")
      .select("deck_id, expires_at, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (
      !link ||
      link.revoked_at ||
      link.deck_id !== deckId ||
      (link.expires_at && new Date(link.expires_at) <= new Date())
    ) {
      throw Object.assign(new Error("Share link unavailable"), {
        status: 403,
      });
    }

    const { data: deck } = await admin
      .from("decks")
      .select("org_id")
      .eq("id", deckId)
      .single();

    if (!deck) {
      throw Object.assign(new Error("Deck not found"), { status: 404 });
    }
    return { orgId: deck.org_id };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw Object.assign(new Error("Authentication required"), { status: 401 });
  }

  const { data: deck } = await supabase
    .from("decks")
    .select("org_id")
    .eq("id", deckId)
    .maybeSingle();

  if (!deck) {
    throw Object.assign(new Error("Deck not found"), { status: 404 });
  }

  return { orgId: deck.org_id };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deckId } = await params;
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return apiError("Invalid narration request", 400);
    }

    const { slideId, shareToken } = parsed.data;
    const voice = normalizeAiTtsVoice(parsed.data.voice);
    const speed = parsed.data.speed ?? 1;

    let orgId: string;
    try {
      ({ orgId } = await authorizeDeckAccess(deckId, shareToken));
    } catch (err) {
      const status =
        err instanceof Error && "status" in err
          ? Number((err as { status: number }).status)
          : 403;
      return apiError(
        err instanceof Error ? err.message : "Forbidden",
        status,
        status === 401 ? "unauthorized" : "forbidden"
      );
    }

    const admin = createAdminClient();
    try {
      await assertOrgCanUsePaidFeatures(admin, orgId);
      await assertRateLimit(orgId, "narrate");
    } catch (err) {
      if (err instanceof PublicError) {
        return apiError(err.message, 402, "payment_required");
      }
      throw err;
    }

    if (!process.env.OPENAI_API_KEY) {
      return apiError("AI voice is not configured", 503, "tts_unavailable");
    }

    const { data: slide, error: slideError } = await admin
      .from("slides")
      .select("*")
      .eq("id", slideId)
      .eq("deck_id", deckId)
      .maybeSingle();

    if (slideError || !slide) {
      return apiError("Slide not found", 404, "not_found");
    }

    const text = buildSlideNarration(mapDbSlide(slide));
    if (!text.trim()) {
      return apiError("Slide has no readable content", 400);
    }

    const mp3 = await getOrCreateNarrationMp3({
      supabase: admin,
      orgId,
      deckId,
      text,
      voice,
      speed,
    });

    const etag = createHash("sha256").update(mp3).digest("hex").slice(0, 24);

    return new NextResponse(new Uint8Array(mp3), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=86400",
        ETag: `"${etag}"`,
        "X-Narration-Voice": voice,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
