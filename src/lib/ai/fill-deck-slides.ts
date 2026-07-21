import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadOrgAiTone } from "@/lib/ai/load-org-tone";
import { loadDeckAudience } from "@/lib/ai/load-deck-audience";
import { loadOrgDeckStyle } from "@/lib/ai/load-org-deck-style";
import { layoutSuggestionHint } from "@/lib/ai/suggest-layout";
import { contentFocusFromMetadata } from "@/lib/ai/load-deck-content-focus";
import { prepareProjectUpdatesForDeck } from "@/lib/ai/project-updates-context";
import { buildSlideFillPrompt } from "@/lib/ai/prompts/slides";
import { slideFillSchemaForLayout } from "@/lib/ai/slide-content-schema";
import { replaceDeckSlidesAtomic } from "@/lib/decks/slide-mutations";
import { resolveChartData } from "@/lib/slides/metrics-to-chart";
import type { DeckOutline, DeckType } from "@/types/slide";

/**
 * Generate all slides first, then atomically replace live rows.
 * On failure before replace, existing slides remain intact.
 */
export async function fillDeckSlides(deckId: string, userId: string) {
  const supabase = createAdminClient();

  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .single();

  if (deckError || !deck) {
    throw new Error("Deck not found");
  }

  const outline = deck.outline as DeckOutline | null;
  if (!outline?.slides?.length) {
    throw new Error("No outline to generate slides from");
  }

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

  const contentFocus = contentFocusFromMetadata(
    deck.metadata,
    deck.type as DeckType
  );
  const projectUpdates = prepareProjectUpdatesForDeck(
    updates,
    contentFocus.includedSections
  );
  const aiTone = await loadOrgAiTone(supabase, deck.org_id);
  const audience = await loadDeckAudience(supabase, deckId);
  const orgStyle = await loadOrgDeckStyle(supabase, deck.org_id, deckId);

  const promptBase = `deck:${deckId}:slides`;
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
    const slides: Array<{
      order: number;
      type: string;
      layout: string;
      title: string;
      content: Record<string, unknown>;
      speaker_notes: string;
    }> = [];

    for (let index = 0; index < outline.slides.length; index += 1) {
      const outlineSlide = outline.slides[index]!;
      const layoutHint = layoutSuggestionHint(
        outlineSlide.title,
        outlineSlide.summary ?? ""
      );
      const prompt = buildSlideFillPrompt({
        deckType: deck.type as DeckType,
        projectName: project?.name ?? "Project",
        projectDescription: project?.description,
        updates: projectUpdates,
        outlineSlide,
        slideIndex: index,
        totalSlides: outline.slides.length,
        aiTone,
        audience,
        extraHints: [
          layoutHint,
          orgStyle?.hint,
        ].filter(Boolean) as string[],
        includedSections: contentFocus.includedSections,
        deckBrief: contentFocus.deckBrief,
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

      slides.push({
        order: index,
        type: outlineSlide.type,
        layout: outlineSlide.layout,
        title: object.title,
        content,
        speaker_notes: object.speakerNotes ?? "",
      });
    }

    await replaceDeckSlidesAtomic({
      supabase,
      deckId,
      orgId: deck.org_id,
      userId,
      reason: "regenerate",
      slides,
      deckStatus: "ready",
    });

    if (genLog?.id) {
      await supabase
        .from("ai_generations")
        .update({
          status: "completed",
          tokens: totalTokens,
        })
        .eq("id", genLog.id);
    }

    return { success: true, slideCount: slides.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Slide generation failed";
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
