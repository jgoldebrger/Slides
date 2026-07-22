import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadOrgAiTone } from "@/lib/ai/load-org-tone";
import { loadDeckAudience } from "@/lib/ai/load-deck-audience";
import { loadOrgDeckStyle } from "@/lib/ai/load-org-deck-style";
import { contentFocusFromMetadata } from "@/lib/ai/load-deck-content-focus";
import { assertProjectContentForGeneration } from "@/lib/ai/no-project-content-error";
import { logAiActivity } from "@/lib/ai/activity";
import { prepareProjectUpdatesForDeck } from "@/lib/ai/project-updates-context";
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

  const aiTone = await loadOrgAiTone(supabase, deck.org_id);
  const audience = await loadDeckAudience(supabase, deckId);
  const orgStyle = await loadOrgDeckStyle(supabase, deck.org_id, deckId);
  const contentFocus = contentFocusFromMetadata(
    deck.metadata,
    deck.type as DeckType,
    updates
  );
  const projectUpdates = prepareProjectUpdatesForDeck(
    updates,
    contentFocus.includedSections
  );
  const contentAnalysis = assertProjectContentForGeneration(projectUpdates);

  const prompt = buildOutlinePrompt({
    deckType: deck.type as DeckType,
    projectName: project?.name ?? "Project",
    projectDescription: project?.description,
    updates: projectUpdates,
    existingOutline,
    existingSlideCount: slideCount ?? 0,
    aiTone,
    audience,
    orgStyleHint: orgStyle?.hint,
    includedSections: contentFocus.includedSections,
    deckBrief: contentFocus.deckBrief,
    contentAnalysis,
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

    await logAiActivity(supabase, {
      orgId: deck.org_id,
      deckId,
      userId,
      action: "outline.generate",
      featureId: "gen_brief_wizard",
      summary: `Generated outline with ${object.slides.length} slides`,
      metadata: { slideCount: object.slides.length },
    });

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
