import { createHash } from "crypto";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { loadOrgAiTone } from "@/lib/ai/load-org-tone";
import { loadDeckAudience } from "@/lib/ai/load-deck-audience";
import { buildChartNarrativePrompt } from "@/lib/ai/prompts/chart-narrative";
import { chartNarrativeSchema } from "@/lib/ai/schemas/deck-ai";
import { createAdminClient } from "@/lib/supabase/admin";

export async function runChartNarrative({
  deckId,
  slideId,
  generationId,
}: {
  deckId: string;
  slideId: string;
  generationId: string;
}) {
  const supabase = createAdminClient();

  await supabase
    .from("ai_generations")
    .update({ status: "processing" })
    .eq("id", generationId);

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select("org_id, project_id")
      .eq("id", deckId)
      .single();

    if (deckError || !deck) throw new Error("Deck not found");

    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("*")
      .eq("id", slideId)
      .eq("deck_id", deckId)
      .single();

    if (slideError || !slide) throw new Error("Slide not found");
    if (slide.layout !== "chart") {
      throw new Error("Chart narrative applies to chart layout slides only");
    }

    const { data: updates } = await supabase
      .from("project_updates")
      .select("metrics")
      .eq("project_id", deck.project_id)
      .single();

    const aiTone = await loadOrgAiTone(supabase, deck.org_id);
    const audience = await loadDeckAudience(supabase, deckId);

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: chartNarrativeSchema,
      prompt: buildChartNarrativePrompt({
        title: slide.title,
        content: slide.content,
        projectMetrics: updates?.metrics,
        aiTone,
        audience,
      }),
    });

    const slideContent = (slide.content as Record<string, unknown>) ?? {};
    const mergedContent = {
      ...slideContent,
      body: object.body,
      chartData: object.chartData,
      chartType: object.chartType,
      caption: object.caption,
      takeaway: object.takeaway,
    };

    const { error } = await supabase
      .from("slides")
      .update({
        content: mergedContent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", slideId);

    if (error) throw new Error(error.message);

    const result = {
      slideId,
      title: slide.title,
      content: mergedContent,
      chartType: object.chartType,
      caption: object.caption,
      takeaway: object.takeaway,
    };

    await supabase
      .from("ai_generations")
      .update({ status: "completed", result })
      .eq("id", generationId);

    return result;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Chart narrative failed";
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: message })
      .eq("id", generationId);
    throw err;
  }
}

export function chartNarrativePromptHash(slideId: string) {
  return createHash("sha256")
    .update(`chart-narrative:${slideId}:${Date.now()}`)
    .digest("hex");
}
