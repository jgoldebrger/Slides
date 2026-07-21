"use server";

import { revalidatePath } from "next/cache";
import { rewritePromptHash } from "@/lib/ai/rewrite-slide";
import {
  enqueueGenerateDeckJob,
  enqueueOutlineDeckJob,
  enqueueRefreshDeckJob,
} from "@/lib/decks/enqueue-jobs";
import { assertDeckJobEntitlement } from "@/lib/deck-rate-limit";
import {
  requireDeckEdit,
  requireDeckAccess,
  getUserOrg,
} from "@/lib/permissions";
import { deckOutlineSchema } from "@/lib/validations";
import { actionError, toPublicError, PublicError } from "@/lib/errors/public-error";
import { sendDeckEvent } from "@/lib/inngest/events";
import type { DeckOutline } from "@/types/slide";

export async function enqueueOutlineGeneration(deckId: string) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "outline");
    await enqueueOutlineDeckJob({
      deckId,
      userId: user.id,
      orgId: deck.org_id,
    });
    revalidatePath(`/decks/${deckId}/outline`);
    return { success: true, status: "processing" as const };
  } catch (err) {
    return actionError(
      toPublicError(err, "Failed to start outline generation")
    );
  }
}

export async function getOutlineJobStatus(deckId: string) {
  const { supabase } = await requireDeckAccess(deckId);

  const { data: gen } = await supabase
    .from("ai_generations")
    .select("status, error")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: deck } = await supabase
    .from("decks")
    .select("outline, status")
    .eq("id", deckId)
    .single();

  return {
    generationStatus: gen?.status ?? "idle",
    error: gen?.error ?? null,
    outline: (deck?.outline as DeckOutline | null) ?? null,
    deckStatus: deck?.status ?? "draft",
  };
}

export async function getDeckStatus(deckId: string) {
  const { supabase, deck } = await requireDeckAccess(deckId);
  const { count } = await supabase
    .from("slides")
    .select("id", { count: "exact", head: true })
    .eq("deck_id", deckId);

  return {
    status: deck.status,
    slideCount: count ?? 0,
  };
}

export async function saveOutline(deckId: string, outline: unknown) {
  const parsed = deckOutlineSchema.safeParse(outline);
  if (!parsed.success) return actionError("Invalid outline");

  const { supabase } = await requireDeckEdit(deckId);
  const { error } = await supabase
    .from("decks")
    .update({
      outline: parsed.data,
      status: "outline",
      updated_at: new Date().toISOString(),
    })
    .eq("id", deckId);

  if (error) return actionError(toPublicError(error));
  revalidatePath(`/decks/${deckId}/outline`);
  return { success: true };
}

export async function approveOutline(deckId: string) {
  const { supabase, deck, user } = await requireDeckEdit(deckId);
  const outline = deck.outline as DeckOutline | null;

  if (!outline?.slides?.length) {
    return actionError("No outline to approve");
  }

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");
    await enqueueGenerateDeckJob({
      supabase,
      deck: { id: deckId, org_id: deck.org_id, status: deck.status },
      userId: user.id,
    });
  } catch (err) {
    return actionError(
      toPublicError(err, "Failed to start slide generation")
    );
  }

  revalidatePath(`/decks/${deckId}/editor`);
  revalidatePath(`/decks/${deckId}/outline`);
  return { success: true, status: "generating" as const };
}

/** Enqueues async rewrite; poll with getAiGenerationStatus / pollAiGeneration. */
export async function rewriteSlide(slideId: string, deckId: string) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);

  const { data: slide } = await supabase
    .from("slides")
    .select("id")
    .eq("id", slideId)
    .eq("deck_id", deckId)
    .maybeSingle();

  if (!slide) return actionError("Slide not found");

  if (!process.env.OPENAI_API_KEY) {
    return actionError("OPENAI_API_KEY is not configured");
  }

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");

    const { data: genLog, error: genError } = await supabase
      .from("ai_generations")
      .insert({
        deck_id: deckId,
        org_id: deck.org_id,
        prompt_hash: rewritePromptHash(slideId),
        model: "gpt-4o-mini",
        status: "pending",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (genError || !genLog) {
      return actionError("Failed to create generation job");
    }

    try {
      await sendDeckEvent("deck/slide.rewrite", {
        deckId,
        slideId,
        userId: user.id,
        orgId: deck.org_id,
        generationId: genLog.id,
      });
    } catch {
      await supabase
        .from("ai_generations")
        .update({ status: "failed", error: "Failed to enqueue rewrite" })
        .eq("id", genLog.id);
      throw new PublicError("Failed to start rewrite");
    }

    return {
      success: true as const,
      status: "processing" as const,
      generationId: genLog.id as string,
    };
  } catch (err) {
    return actionError(toPublicError(err, "Failed to start rewrite"));
  }
}

export async function listDecks() {
  const { supabase, orgId } = await getUserOrg();
  const { data } = await supabase
    .from("decks")
    .select("id, name, type, status, updated_at, projects(name)")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function updateApplyBranding(
  deckId: string,
  applyBranding: boolean
) {
  const { supabase } = await requireDeckEdit(deckId);
  const { error } = await supabase
    .from("decks")
    .update({
      apply_branding: applyBranding,
      updated_at: new Date().toISOString(),
    })
    .eq("id", deckId);

  if (error) return actionError(toPublicError(error));

  revalidatePath(`/decks/${deckId}/export`);
  revalidatePath(`/decks/${deckId}/editor`);
  revalidatePath(`/decks/${deckId}/player`);
  return { success: true };
}

export async function enqueueDeckGeneration(deckId: string) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");
    await enqueueGenerateDeckJob({
      supabase,
      deck: { id: deckId, org_id: deck.org_id, status: deck.status },
      userId: user.id,
    });
    return { success: true };
  } catch (err) {
    return actionError(toPublicError(err, "Failed to start generation"));
  }
}

export async function refreshSlidesFromUpdates(deckId: string) {
  const { user, deck, supabase } = await requireDeckEdit(deckId);

  const { count } = await supabase
    .from("slides")
    .select("id", { count: "exact", head: true })
    .eq("deck_id", deckId);

  if (!count) {
    return actionError(
      "No slides to refresh — generate slides from an outline first"
    );
  }

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");
    await enqueueRefreshDeckJob({
      supabase,
      deck: { id: deckId, org_id: deck.org_id, status: deck.status },
      userId: user.id,
    });

    revalidatePath(`/decks/${deckId}/editor`);
    return { success: true, status: "generating" as const };
  } catch (err) {
    return actionError(toPublicError(err, "Failed to start refresh"));
  }
}

export async function deleteDeck(deckId: string) {
  const { supabase } = await requireDeckEdit(deckId);
  const { error } = await supabase.from("decks").delete().eq("id", deckId);
  if (error) return actionError(toPublicError(error));
  revalidatePath("/decks");
  return { success: true };
}
