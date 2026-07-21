"use server";

import { revalidatePath } from "next/cache";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildDeckChatPrompt } from "@/lib/ai/prompts/deck-chat";
import { deckChatResponseSchema } from "@/lib/ai/schemas/deck-chat";
import { loadOrgAiTone } from "@/lib/ai/load-org-tone";
import { loadDeckAudience } from "@/lib/ai/load-deck-audience";
import { suggestLayoutForContent } from "@/lib/ai/suggest-layout";
import { appendDeckChatHistory } from "@/lib/actions/ai-enhancements";
import { normalizeProjectUpdatesForAi } from "@/lib/ai/project-updates-context";
import { buildSlideFillPrompt } from "@/lib/ai/prompts/slides";
import { slideFillSchemaForLayout } from "@/lib/ai/slide-content-schema";
import { assertDeckJobEntitlement } from "@/lib/deck-rate-limit";
import { actionError, toPublicError } from "@/lib/errors/public-error";
import { requireDeckEdit } from "@/lib/permissions";
import { rewriteSlide } from "@/lib/actions/decks";
import {
  generateSpeakerNotes,
  runDeckQaCheck,
} from "@/lib/actions/ai-enhancements";
import { reorderSlides } from "@/lib/actions/slides";
import type { DeckChatAction } from "@/lib/ai/schemas/deck-chat";
import type { SlideLayout } from "@/types/slide";

export type DeckChatActionResult = {
  type: DeckChatAction["type"];
  success: boolean;
  message: string;
  generationId?: string;
  slideId?: string;
  pendingConfirmation?: boolean;
  slideOrder?: number;
};

export async function sendDeckChatMessage(
  deckId: string,
  message: string,
  options?: { confirmDeletes?: boolean }
) {
  const trimmed = message.trim();
  if (!trimmed) return actionError("Enter a message");
  if (trimmed.length > 1000) return actionError("Message is too long");

  const { supabase, user, deck } = await requireDeckEdit(deckId);

  if (!process.env.OPENAI_API_KEY) {
    return actionError("OPENAI_API_KEY is not configured");
  }

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");
  } catch (err) {
    return actionError(toPublicError(err, "AI is not available"));
  }

  const { data: slides, error: slidesError } = await supabase
    .from("slides")
    .select("id, order, title, layout, type")
    .eq("deck_id", deckId)
    .order("order");

  if (slidesError) return actionError(toPublicError(slidesError));
  if (!slides?.length) {
    return actionError("Add slides before using deck chat");
  }

  const aiTone = await loadOrgAiTone(supabase, deck.org_id);
  const audience = await loadDeckAudience(supabase, deckId);

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: deckChatResponseSchema,
      prompt: buildDeckChatPrompt({
        deckName: deck.name,
        slides: slides.map((s) => ({
          order: s.order,
          title: s.title,
          layout: s.layout,
        })),
        userMessage: trimmed,
        aiTone,
        audience,
      }),
    });

    const actionResults: DeckChatActionResult[] = [];
    let selectSlideId: string | undefined;
    const generationIds: string[] = [];

    for (const action of object.actions) {
      const result = await executeDeckChatAction({
        supabase,
        deck,
        deckId,
        slides,
        action,
        confirmDeletes: options?.confirmDeletes,
      });
      actionResults.push(result);
      if (result.generationId) generationIds.push(result.generationId);
      if (result.slideId && action.type === "select_slide") {
        selectSlideId = result.slideId;
      }
    }

    revalidatePath(`/decks/${deckId}/editor`);

    await appendDeckChatHistory(deckId, [
      { role: "user", content: trimmed },
      { role: "assistant", content: object.reply },
    ]);

    const pendingDelete = actionResults.find(
      (r) => r.type === "delete_slide" && r.pendingConfirmation
    );

    return {
      success: true as const,
      reply: object.reply,
      actionResults,
      generationIds,
      selectSlideId,
      pendingDelete: pendingDelete
        ? { slideOrder: pendingDelete.slideOrder! }
        : undefined,
    };
  } catch (err) {
    return actionError(toPublicError(err, "Deck chat failed"));
  }
}

async function executeDeckChatAction({
  supabase,
  deck,
  deckId,
  slides,
  action,
  confirmDeletes,
}: {
  supabase: Awaited<ReturnType<typeof requireDeckEdit>>["supabase"];
  deck: Awaited<ReturnType<typeof requireDeckEdit>>["deck"];
  deckId: string;
  slides: Array<{ id: string; order: number; title: string; layout: string; type: string }>;
  action: DeckChatAction;
  confirmDeletes?: boolean;
}): Promise<DeckChatActionResult> {
  switch (action.type) {
    case "select_slide": {
      const slide = slides[action.slideOrder - 1];
      if (!slide) {
        return {
          type: action.type,
          success: false,
          message: `Slide ${action.slideOrder} not found`,
        };
      }
      return {
        type: action.type,
        success: true,
        message: `Selected slide ${action.slideOrder}`,
        slideId: slide.id,
      };
    }

    case "delete_slide": {
      const slide = slides[action.slideOrder - 1];
      if (!slide) {
        return {
          type: action.type,
          success: false,
          message: `Slide ${action.slideOrder} not found`,
        };
      }
      if (slides.length <= 1) {
        return {
          type: action.type,
          success: false,
          message: "Cannot delete the only slide",
        };
      }
      if (!confirmDeletes) {
        return {
          type: action.type,
          success: false,
          message: `Confirm deletion of slide ${action.slideOrder}`,
          pendingConfirmation: true,
          slideOrder: action.slideOrder,
        };
      }
      const { error } = await supabase
        .from("slides")
        .delete()
        .eq("id", slide.id)
        .eq("deck_id", deckId);
      return {
        type: action.type,
        success: !error,
        message: error ? "Delete failed" : `Deleted slide ${action.slideOrder}`,
      };
    }

    case "rewrite_slide": {
      const slide = slides[action.slideOrder - 1];
      if (!slide) {
        return {
          type: action.type,
          success: false,
          message: `Slide ${action.slideOrder} not found`,
        };
      }
      const result = await rewriteSlide(slide.id, deckId, action.instructions);
      if ("error" in result && result.error) {
        return {
          type: action.type,
          success: false,
          message: result.error,
        };
      }
      return {
        type: action.type,
        success: true,
        message: `Rewriting slide ${action.slideOrder}`,
        generationId:
          "generationId" in result ? result.generationId : undefined,
        slideId: slide.id,
      };
    }

    case "add_slide": {
      const layout =
        action.layout ?? suggestLayoutForContent(action.title, action.contentHint);
      const insertIndex =
        action.position !== undefined
          ? Math.min(Math.max(action.position - 1, 0), slides.length)
          : slides.length;

      const { data: project } = await supabase
        .from("projects")
        .select("name, description")
        .eq("id", deck.project_id)
        .single();

      const { data: updates } = await supabase
        .from("project_updates")
        .select("*")
        .eq("project_id", deck.project_id)
        .single();

      const aiTone = await loadOrgAiTone(supabase, deck.org_id);
      const audience = await loadDeckAudience(supabase, deckId);

      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: slideFillSchemaForLayout(layout),
        prompt: buildSlideFillPrompt({
          deckType: deck.type as import("@/types/slide").DeckType,
          projectName: project?.name ?? "Project",
          projectDescription: project?.description,
          updates: normalizeProjectUpdatesForAi(updates ?? {}),
          outlineSlide: {
            title: action.title,
            layout,
            type: "content",
            summary: action.contentHint,
          },
          slideIndex: insertIndex,
          totalSlides: slides.length + 1,
          aiTone,
          audience,
        }),
      });

      const { data: inserted, error } = await supabase
        .from("slides")
        .insert({
          deck_id: deckId,
          order: slides.length,
          title: object.title || action.title,
          layout,
          type: "content",
          content: object.content,
          speaker_notes: object.speakerNotes ?? "",
        })
        .select("id")
        .single();

      if (error || !inserted) {
        return {
          type: action.type,
          success: false,
          message: "Could not add slide",
        };
      }

      const orderedIds = slides.map((s) => s.id);
      orderedIds.splice(insertIndex, 0, inserted.id);
      const reorderResult = await reorderSlides(deckId, orderedIds);
      if ("error" in reorderResult && reorderResult.error) {
        return {
          type: action.type,
          success: false,
          message: reorderResult.error,
        };
      }

      return {
        type: action.type,
        success: true,
        message: `Added "${action.title}"`,
        slideId: inserted.id,
      };
    }

    case "run_deck_qa": {
      const result = await runDeckQaCheck(deckId);
      if ("error" in result && result.error) {
        return { type: action.type, success: false, message: result.error };
      }
      return {
        type: action.type,
        success: true,
        message: "Deck QA started",
        generationId:
          "generationId" in result ? result.generationId : undefined,
      };
    }

    case "reorder_slides": {
      const slide = slides[action.slideOrder - 1];
      if (!slide) {
        return {
          type: action.type,
          success: false,
          message: `Slide ${action.slideOrder} not found`,
        };
      }
      const orderedIds = slides.map((s) => s.id);
      orderedIds.splice(action.slideOrder - 1, 1);
      const targetIndex = Math.min(
        Math.max(action.newPosition - 1, 0),
        orderedIds.length
      );
      orderedIds.splice(targetIndex, 0, slide.id);
      const reorderResult = await reorderSlides(deckId, orderedIds);
      if ("error" in reorderResult && reorderResult.error) {
        return {
          type: action.type,
          success: false,
          message: reorderResult.error,
        };
      }
      return {
        type: action.type,
        success: true,
        message: `Moved slide ${action.slideOrder} to position ${action.newPosition}`,
      };
    }

    case "generate_speaker_notes": {
      const slide =
        action.slideOrder !== undefined
          ? slides[action.slideOrder - 1]
          : undefined;
      const result = await generateSpeakerNotes(deckId, {
        slideId: slide?.id,
      });
      if ("error" in result && result.error) {
        return { type: action.type, success: false, message: result.error };
      }
      return {
        type: action.type,
        success: true,
        message: slide
          ? `Generating notes for slide ${action.slideOrder}`
          : "Generating notes for all slides",
        generationId:
          "generationId" in result ? result.generationId : undefined,
      };
    }

    default: {
      return {
        type: "select_slide" as const,
        success: false,
        message: "Unknown action",
      };
    }
  }
}
