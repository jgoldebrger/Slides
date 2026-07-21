import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildOutlinePrompt } from "@/lib/ai/prompts/outline";
import { deckOutlineSchema } from "@/lib/validations";
import type { DeckOutline, DeckType } from "@/types/slide";

export async function runGenerateOutline(deckId: string, userId: string) {
  const supabase = createAdminClient();

  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .single();

  if (deckError || !deck) {
    throw new Error("Deck not found");
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

  const existingOutline = deck.outline as DeckOutline | null;

  const { count: slideCount } = await supabase
    .from("slides")
    .select("id", { count: "exact", head: true })
    .eq("deck_id", deckId);

  const prompt = buildOutlinePrompt({
    deckType: deck.type as DeckType,
    projectName: project?.name ?? "Project",
    projectDescription: project?.description,
    updates: updates ?? {},
    existingOutline,
    existingSlideCount: slideCount ?? 0,
  });

  const promptHash = createHash("sha256").update(prompt).digest("hex");

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

  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const { object, usage } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: deckOutlineSchema,
      prompt,
    });

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
        .update({
          status: "completed",
          tokens: usage?.totalTokens ?? null,
        })
        .eq("id", genLog.id);
    }

    return { success: true, outline: object };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    if (genLog?.id) {
      await supabase
        .from("ai_generations")
        .update({ status: "failed", error: message })
        .eq("id", genLog.id);
    }
    throw err;
  }
}
