import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleApiError } from "@/lib/api/response";
import { requireDeckEdit } from "@/lib/permissions";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return apiError("Invalid deck ID", 400, "invalid_request");
    }

    const { id: deckId } = parsedParams.data;
    const { supabase } = await requireDeckEdit(deckId);
    const { data: questions, error } = await supabase
      .from("deferred_questions")
      .select(
        "id, question, viewer_email, status, owner_answer, answered_at, created_at"
      )
      .eq("deck_id", deckId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return NextResponse.json({ questions: questions ?? [] });
  } catch (error) {
    return handleApiError(error);
  }
}
