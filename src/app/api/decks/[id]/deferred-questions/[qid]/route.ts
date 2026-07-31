import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, handleApiError } from "@/lib/api/response";
import { requireDeckEdit } from "@/lib/permissions";

const paramsSchema = z.object({
  id: z.string().uuid(),
  qid: z.string().uuid(),
});

const bodySchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("answered"),
    owner_answer: z.string().trim().min(1).max(5000),
  }),
  z.object({
    status: z.enum(["pending", "dismissed"]),
    owner_answer: z.null().optional(),
  }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  try {
    const parsedParams = paramsSchema.safeParse(await params);
    if (!parsedParams.success) {
      return apiError("Invalid question ID", 400, "invalid_request");
    }

    const parsedBody = bodySchema.safeParse(
      await request.json().catch(() => null)
    );
    if (!parsedBody.success) {
      return apiError("Invalid deferred question update", 400, "invalid_request");
    }

    const { id: deckId, qid } = parsedParams.data;
    const { supabase } = await requireDeckEdit(deckId);
    const answered = parsedBody.data.status === "answered";
    const { data: question, error } = await supabase
      .from("deferred_questions")
      .update({
        status: parsedBody.data.status,
        owner_answer: answered ? parsedBody.data.owner_answer : null,
        answered_at: answered ? new Date().toISOString() : null,
      })
      .eq("id", qid)
      .eq("deck_id", deckId)
      .select(
        "id, question, viewer_email, status, owner_answer, answered_at, created_at"
      )
      .maybeSingle();

    if (error) throw error;
    if (!question) {
      return apiError("Deferred question not found", 404, "not_found");
    }

    return NextResponse.json({ question });
  } catch (error) {
    return handleApiError(error);
  }
}
