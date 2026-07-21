import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadOrgAiTone } from "@/lib/ai/load-org-tone";
import { loadDeckAudience } from "@/lib/ai/load-deck-audience";
import { buildSlideFillPrompt } from "@/lib/ai/prompts/slides";
import { slideFillSchemaForLayout } from "@/lib/ai/slide-content-schema";
import { snapshotDeckSlides } from "@/lib/decks/revisions";
import { applySlideContentBatch } from "@/lib/decks/slide-mutations";
import { resolveChartData } from "@/lib/slides/metrics-to-chart";
import type { DeckOutline, DeckType, OutlineSlide } from "@/types/slide";

/**
 * Re-fills existing slides from project updates.
 * Generates all content first, then applies updates in one transaction.
 */
export async function refreshDeckSlides(
  deckId: string,
  userId: string,
  options?: { revisionReason?: import("@/lib/decks/revisions").RevisionReason }
) {
  const supabase = createAdminClient();

  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .single();

  if (deckError || !deck) {
    throw new Error("Deck not found");
  }

  const { data: existingSlides, error: slidesError } = await supabase
    .from("slides")
    .select("id, order, type, layout, title")
    .eq("deck_id", deckId)
    .order("order");

  if (slidesError) {
    throw new Error(slidesError.message);
  }

  if (!existingSlides?.length) {
    throw new Error("No slides to refresh — generate slides from an outline first");
  }

  await snapshotDeckSlides({
    supabase,
    deckId,
    orgId: deck.org_id,
    userId,
    reason: options?.revisionReason ?? "refresh",
  });

  const outline = deck.outline as DeckOutline | null;

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

  const promptBase = `deck:${deckId}:refresh`;
  const promptHash = createHash("sha256").update(promptBase).digest("hex");

  const { data: genLog } = await supabase
    .from("ai_generations")
    .insert({
      deck_id: deckId,
      org_id: deck.org_id,
      prompt_hash: promptHash,
      model: "gpt-4o-mini",
      status: "pending",
      created_by: userId,
    })
    .select("id")
    .single();

  await supabase
    .from("decks")
    .update({ status: "generating", updated_at: new Date().toISOString() })
    .eq("id", deckId);

  if (!process.env.OPENAI_API_KEY) {
    const message = "OPENAI_API_KEY is not configured";
    await supabase
      .from("decks")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", deckId);
    if (genLog?.id) {
      await supabase
        .from("ai_generations")
        .update({ status: "failed", error: message })
        .eq("id", genLog.id);
    }
    throw new Error(message);
  }

  let totalTokens = 0;

  try {
    const batch: Array<{
      id: string;
      title: string;
      content: Record<string, unknown>;
      speaker_notes: string;
    }> = [];

    // Sequential generation: build full batch before any live writes
    for (let index = 0; index < existingSlides.length; index += 1) {
      const slide = existingSlides[index]!;
      const outlineSlide: OutlineSlide = outline?.slides[index] ?? {
        title: slide.title,
        layout: slide.layout as OutlineSlide["layout"],
        type: slide.type,
        summary: slide.title,
      };

      const prompt = buildSlideFillPrompt({
        deckType: deck.type as DeckType,
        projectName: project?.name ?? "Project",
        projectDescription: project?.description,
        updates: updates ?? {},
        outlineSlide,
        slideIndex: index,
        totalSlides: existingSlides.length,
        aiTone,
        audience,
      });

      const { object, usage } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: slideFillSchemaForLayout(outlineSlide.layout),
        prompt,
      });

      totalTokens += usage?.totalTokens ?? 0;

      const content = { ...object.content } as Record<string, unknown>;
      if (outlineSlide.layout === "chart") {
        const chartData = resolveChartData({
          metrics: updates?.metrics,
          chartData: content.chartData as
            | Array<Record<string, string | number>>
            | undefined,
        });
        if (chartData.length) {
          content.chartData = chartData;
        }
      }

      batch.push({
        id: slide.id,
        title: object.title,
        content,
        speaker_notes: object.speakerNotes ?? "",
      });
    }

    await applySlideContentBatch({
      supabase,
      deckId,
      updates: batch,
    });

    await supabase
      .from("decks")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", deckId);

    if (genLog?.id) {
      await supabase
        .from("ai_generations")
        .update({
          status: "completed",
          tokens: totalTokens,
        })
        .eq("id", genLog.id);
    }

    return { success: true, slideCount: existingSlides.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Slide refresh failed";
    await supabase
      .from("decks")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", deckId);
    if (genLog?.id) {
      await supabase
        .from("ai_generations")
        .update({ status: "failed", error: message })
        .eq("id", genLog.id);
    }
    throw err;
  }
}
