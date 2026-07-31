import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateNarrationMp3 } from "@/lib/ai/tts";
import { AI_TTS_VOICES, normalizeAiTtsVoice } from "@/lib/ai/tts-voices";
import { apiError, handleApiError } from "@/lib/api/response";
import { assertOrgCanUsePaidFeatures } from "@/lib/billing/entitlements";
import { PublicError } from "@/lib/errors/public-error";
import { assertRateLimit } from "@/lib/rate-limit";
import { authorizeDeckAccess } from "@/lib/share/authorize-deck-access";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  text: z.string().trim().min(1).max(4000),
  voice: z.enum(AI_TTS_VOICES).optional(),
  speed: z.number().min(0.25).max(4).optional(),
  shareToken: z.string().min(16).max(200),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deckId } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return apiError("Invalid speech request", 400);

    const { text, shareToken } = parsed.data;
    const voice = normalizeAiTtsVoice(parsed.data.voice);
    const speed = parsed.data.speed ?? 1;

    let orgId: string;
    try {
      ({ orgId } = await authorizeDeckAccess(deckId, shareToken));
    } catch (error) {
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

    if (!process.env.OPENAI_API_KEY) {
      return apiError("AI voice is not configured", 503, "tts_unavailable");
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
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
