import { NextResponse } from "next/server";
import { buildOutlineStreamContext } from "@/lib/ai/stream-outline";
import { deckOutlineSchema } from "@/lib/validations";
import { apiError, handleApiError } from "@/lib/api/response";
import { requireDeckEdit } from "@/lib/permissions";
import { streamObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { createHash } from "crypto";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deckId } = await params;
    const { user } = await requireDeckEdit(deckId);

    if (!process.env.OPENAI_API_KEY) {
      return apiError("OPENAI_API_KEY is not configured", 503);
    }

    const { supabase, deck, prompt } = await buildOutlineStreamContext(deckId);
    const promptHash = createHash("sha256").update(prompt).digest("hex");

    const { data: genLog } = await supabase
      .from("ai_generations")
      .insert({
        deck_id: deckId,
        org_id: deck.org_id,
        prompt_hash: promptHash,
        model: "gpt-4o-mini",
        status: "processing",
        created_by: user.id,
      })
      .select("id")
      .single();

    const result = streamObject({
      model: openai("gpt-4o-mini"),
      schema: deckOutlineSchema,
      prompt,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const partial of result.partialObjectStream) {
            if (partial?.slides?.length) {
              controller.enqueue(
                encoder.encode(
                  `${JSON.stringify({ type: "partial", outline: partial })}\n`
                )
              );
            }
          }

          const object = await result.object;

          await supabase
            .from("decks")
            .update({
              outline: object,
              status: "outline",
              updated_at: new Date().toISOString(),
            })
            .eq("id", deckId);

          if (genLog?.id) {
            await supabase
              .from("ai_generations")
              .update({ status: "completed" })
              .eq("id", genLog.id);
          }

          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({ type: "complete", outline: object })}\n`
            )
          );
          controller.close();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Outline stream failed";
          if (genLog?.id) {
            await supabase
              .from("ai_generations")
              .update({ status: "failed", error: message })
              .eq("id", genLog.id);
          }
          controller.enqueue(
            encoder.encode(`${JSON.stringify({ type: "error", error: message })}\n`)
          );
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
