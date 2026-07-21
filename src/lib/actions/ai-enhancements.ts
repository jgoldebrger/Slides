"use server";

import { revalidatePath } from "next/cache";
import { assertDeckJobEntitlement } from "@/lib/deck-rate-limit";
import { altTextPromptHash } from "@/lib/ai/generate-alt-text";
import { chartNarrativePromptHash } from "@/lib/ai/generate-chart-narrative";
import { shareBlurbPromptHash } from "@/lib/ai/generate-share-blurb";
import { speakerNotesPromptHash } from "@/lib/ai/generate-speaker-notes";
import { deckQaPromptHash } from "@/lib/ai/run-deck-qa";
import { translateDeckPromptHash } from "@/lib/ai/translate-deck";
import { narrateDeckPromptHash } from "@/lib/ai/run-narrate-deck";
import { forkDeck } from "@/lib/decks/fork-deck";
import { enqueueRefreshDeckJob } from "@/lib/decks/enqueue-jobs";
import { sendEmail } from "@/lib/email/client";
import { rewriteSlide } from "@/lib/actions/decks";
import { audienceFromDeckMetadata } from "@/lib/ai/load-deck-audience";
import { normalizeDeckAudience, type DeckAudience } from "@/lib/ai/audience";
import { actionError, toPublicError, PublicError } from "@/lib/errors/public-error";
import { sendDeckEvent } from "@/lib/inngest/events";
import { requireDeckAccess, requireDeckEdit } from "@/lib/permissions";
import { deckAudienceSchema } from "@/lib/validations/deck-metadata";
import type { DeckQaResult } from "@/lib/ai/schemas/deck-ai";

async function enqueueAiJob({
  supabase,
  deckId,
  orgId,
  userId,
  promptHash,
  eventName,
  eventData,
}: {
  supabase: Awaited<ReturnType<typeof requireDeckEdit>>["supabase"];
  deckId: string;
  orgId: string;
  userId: string;
  promptHash: string;
  eventName:
    | "deck/speaker-notes.generate"
    | "deck/qa.run"
    | "deck/slide.chart-narrative"
    | "deck/slide.alt-text"
    | "deck/share-blurb.generate"
    | "deck/translate"
    | "deck/narrate";
  eventData: Record<string, unknown>;
}) {
  const { data: genLog, error: genError } = await supabase
    .from("ai_generations")
    .insert({
      deck_id: deckId,
      org_id: orgId,
      prompt_hash: promptHash,
      model: "gpt-4o-mini",
      status: "pending",
      created_by: userId,
    })
    .select("id")
    .single();

  if (genError || !genLog) {
    return { error: "Failed to create generation job" } as const;
  }

  try {
    await sendDeckEvent(eventName, {
      ...eventData,
      generationId: genLog.id,
    });
  } catch {
    await supabase
      .from("ai_generations")
      .update({ status: "failed", error: "Failed to enqueue job" })
      .eq("id", genLog.id);
    throw new PublicError("Failed to start AI job");
  }

  return {
    success: true as const,
    status: "processing" as const,
    generationId: genLog.id as string,
  };
}

export async function getDeckAudience(deckId: string) {
  const { supabase } = await requireDeckAccess(deckId);
  const { data } = await supabase
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();

  return { audience: audienceFromDeckMetadata(data?.metadata) };
}

export async function updateDeckAudience(deckId: string, audience: DeckAudience) {
  const parsed = deckAudienceSchema.safeParse(audience);
  if (!parsed.success) return actionError("Invalid audience");

  const { supabase } = await requireDeckEdit(deckId);
  const { data: deck } = await supabase
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();

  const metadata = (deck?.metadata as Record<string, unknown>) ?? {};
  const { error } = await supabase
    .from("decks")
    .update({
      metadata: { ...metadata, audience: parsed.data },
      updated_at: new Date().toISOString(),
    })
    .eq("id", deckId);

  if (error) return actionError(toPublicError(error));

  revalidatePath(`/decks/${deckId}/outline`);
  revalidatePath(`/decks/${deckId}/editor`);
  return { success: true, audience: parsed.data };
}

export async function generateSpeakerNotes(
  deckId: string,
  options?: { slideId?: string }
) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);
  const scope = options?.slideId ? "slide" : "deck";

  if (!process.env.OPENAI_API_KEY) {
    return actionError("OPENAI_API_KEY is not configured");
  }

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");
    return await enqueueAiJob({
      supabase,
      deckId,
      orgId: deck.org_id,
      userId: user.id,
      promptHash: speakerNotesPromptHash(deckId, options?.slideId),
      eventName: "deck/speaker-notes.generate",
      eventData: {
        deckId,
        userId: user.id,
        orgId: deck.org_id,
        slideId: options?.slideId,
        scope,
      },
    });
  } catch (err) {
    return actionError(toPublicError(err, "Failed to generate speaker notes"));
  }
}

export async function runDeckQaCheck(deckId: string) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);

  if (!process.env.OPENAI_API_KEY) {
    return actionError("OPENAI_API_KEY is not configured");
  }

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");
    return await enqueueAiJob({
      supabase,
      deckId,
      orgId: deck.org_id,
      userId: user.id,
      promptHash: deckQaPromptHash(deckId),
      eventName: "deck/qa.run",
      eventData: {
        deckId,
        userId: user.id,
        orgId: deck.org_id,
      },
    });
  } catch (err) {
    return actionError(toPublicError(err, "Failed to run deck QA"));
  }
}

export async function generateChartNarrative(deckId: string, slideId: string) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);

  if (!process.env.OPENAI_API_KEY) {
    return actionError("OPENAI_API_KEY is not configured");
  }

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");
    return await enqueueAiJob({
      supabase,
      deckId,
      orgId: deck.org_id,
      userId: user.id,
      promptHash: chartNarrativePromptHash(slideId),
      eventName: "deck/slide.chart-narrative",
      eventData: {
        deckId,
        slideId,
        userId: user.id,
        orgId: deck.org_id,
      },
    });
  } catch (err) {
    return actionError(toPublicError(err, "Failed to generate chart narrative"));
  }
}

export async function generateAltText(deckId: string, slideId: string) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);

  if (!process.env.OPENAI_API_KEY) {
    return actionError("OPENAI_API_KEY is not configured");
  }

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");
    return await enqueueAiJob({
      supabase,
      deckId,
      orgId: deck.org_id,
      userId: user.id,
      promptHash: altTextPromptHash(slideId),
      eventName: "deck/slide.alt-text",
      eventData: {
        deckId,
        slideId,
        userId: user.id,
        orgId: deck.org_id,
      },
    });
  } catch (err) {
    return actionError(toPublicError(err, "Failed to generate alt text"));
  }
}

export async function generateShareBlurb(deckId: string) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);

  if (!process.env.OPENAI_API_KEY) {
    return actionError("OPENAI_API_KEY is not configured");
  }

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");
    return await enqueueAiJob({
      supabase,
      deckId,
      orgId: deck.org_id,
      userId: user.id,
      promptHash: shareBlurbPromptHash(deckId),
      eventName: "deck/share-blurb.generate",
      eventData: {
        deckId,
        userId: user.id,
        orgId: deck.org_id,
      },
    });
  } catch (err) {
    return actionError(toPublicError(err, "Failed to generate share blurb"));
  }
}

export async function getDeckShareBlurb(deckId: string) {
  const { supabase } = await requireDeckAccess(deckId);
  const { data } = await supabase
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();

  const metadata = (data?.metadata as { shareBlurb?: string }) ?? {};
  return { blurb: metadata.shareBlurb ?? null };
}

export async function getDeckQaResult(deckId: string) {
  const { supabase } = await requireDeckAccess(deckId);
  const { data } = await supabase
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();

  const metadata = (data?.metadata as { lastQa?: DeckQaResult }) ?? {};
  return { qa: metadata.lastQa ?? null };
}

export async function createAudienceVariant(
  deckId: string,
  audience: DeckAudience,
  options?: { forkAsSeparateDeck?: boolean }
) {
  const parsed = deckAudienceSchema.safeParse(audience);
  if (!parsed.success) return actionError("Invalid audience");

  const { supabase, user, deck } = await requireDeckEdit(deckId);

  const { count } = await supabase
    .from("slides")
    .select("id", { count: "exact", head: true })
    .eq("deck_id", deckId);

  if (!count) {
    return actionError("Generate slides before creating an audience variant");
  }

  if (options?.forkAsSeparateDeck) {
    try {
      const forked = await forkDeck({
        supabase,
        sourceDeckId: deckId,
        orgId: deck.org_id,
        userId: user.id,
        audience: parsed.data,
      });

      await enqueueRefreshDeckJob({
        supabase,
        deck: { id: forked.deckId, org_id: deck.org_id, status: "ready" },
        userId: user.id,
        revisionReason: "audience_variant",
      });

      revalidatePath(`/decks/${forked.deckId}/editor`);
      return {
        success: true as const,
        forkedDeckId: forked.deckId,
        forkedDeckName: forked.name,
        audience: normalizeDeckAudience(parsed.data),
        status: "generating" as const,
      };
    } catch (err) {
      return actionError(toPublicError(err, "Could not fork audience variant"));
    }
  }

  const metadata = (deck.metadata as Record<string, unknown>) ?? {};
  const { error } = await supabase
    .from("decks")
    .update({
      metadata: { ...metadata, audience: parsed.data },
      updated_at: new Date().toISOString(),
    })
    .eq("id", deckId);

  if (error) return actionError(toPublicError(error));

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");
    await enqueueRefreshDeckJob({
      supabase,
      deck: { id: deckId, org_id: deck.org_id, status: deck.status },
      userId: user.id,
      revisionReason: "audience_variant",
    });
  } catch (err) {
    return actionError(toPublicError(err, "Failed to refresh for audience"));
  }

  revalidatePath(`/decks/${deckId}/editor`);
  return {
    success: true as const,
    audience: normalizeDeckAudience(parsed.data),
    status: "generating" as const,
  };
}

export async function applyQaFix(
  deckId: string,
  findingIndex: number
) {
  const { supabase } = await requireDeckEdit(deckId);
  const { data } = await supabase
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();

  const qa = (data?.metadata as { lastQa?: DeckQaResult })?.lastQa;
  const finding = qa?.findings?.[findingIndex];
  if (!finding?.fixInstruction) {
    return actionError("QA finding not found");
  }

  if (finding.slideOrder === null) {
    return actionError("This finding applies to the whole deck — use chat or manual edits");
  }

  const { data: slides } = await supabase
    .from("slides")
    .select("id, order")
    .eq("deck_id", deckId)
    .order("order");

  const slide = slides?.[finding.slideOrder - 1];
  if (!slide) return actionError("Slide not found");

  return rewriteSlide(slide.id, deckId, finding.fixInstruction);
}

export async function translateDeck(
  deckId: string,
  language: import("@/lib/ai/schemas/translate").TranslateLanguage
) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);

  if (!process.env.OPENAI_API_KEY) {
    return actionError("OPENAI_API_KEY is not configured");
  }

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");
    return await enqueueAiJob({
      supabase,
      deckId,
      orgId: deck.org_id,
      userId: user.id,
      promptHash: translateDeckPromptHash(deckId, language),
      eventName: "deck/translate",
      eventData: {
        deckId,
        userId: user.id,
        orgId: deck.org_id,
        language,
      },
    });
  } catch (err) {
    return actionError(toPublicError(err, "Failed to start translation"));
  }
}

export async function narrateFullDeck(deckId: string) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);

  if (!process.env.OPENAI_API_KEY) {
    return actionError("OPENAI_API_KEY is not configured");
  }

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");
    return await enqueueAiJob({
      supabase,
      deckId,
      orgId: deck.org_id,
      userId: user.id,
      promptHash: narrateDeckPromptHash(deckId),
      eventName: "deck/narrate",
      eventData: {
        deckId,
        userId: user.id,
        orgId: deck.org_id,
      },
    });
  } catch (err) {
    return actionError(toPublicError(err, "Failed to start narration"));
  }
}

export async function generateTitleHeroImage(deckId: string) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);

  const { data: titleSlide } = await supabase
    .from("slides")
    .select("id, layout")
    .eq("deck_id", deckId)
    .order("order")
    .limit(1)
    .maybeSingle();

  if (!titleSlide) return actionError("No slides in deck");

  const formData = new FormData();
  formData.set(
    "instructions",
    "Hero cover image for title slide — professional, on-brand, minimal text"
  );
  formData.set("style", "abstract");

  const { createSlideVisual } = await import("@/lib/actions/visuals");
  return createSlideVisual(deckId, titleSlide.id, formData);
}

export async function sendDeckShareEmail(
  deckId: string,
  input: { to: string; shareUrl: string; message?: string }
) {
  const email = input.to.trim();
  if (!email || !email.includes("@")) return actionError("Enter a valid email");

  const { supabase } = await requireDeckEdit(deckId);
  const { data: deck } = await supabase
    .from("decks")
    .select("name, metadata")
    .eq("id", deckId)
    .single();

  const blurb =
    input.message?.trim() ||
    ((deck?.metadata as { shareBlurb?: string })?.shareBlurb ?? "");

  const html = `<p>${blurb || `View the deck "${deck?.name ?? "UpdateDeck"}"`}</p><p><a href="${input.shareUrl}">Open presentation</a></p>`;

  const result = await sendEmail({
    to: email,
    subject: `Shared deck: ${deck?.name ?? "UpdateDeck"}`,
    html,
  });

  if ("skipped" in result && result.skipped) {
    return actionError("Email is not configured (RESEND_API_KEY)");
  }
  if ("error" in result && result.error) {
    return actionError(result.error);
  }

  return { success: true as const };
}

export async function setWeeklyAutoDraft(deckId: string, enabled: boolean) {
  const { supabase } = await requireDeckEdit(deckId);
  const { data: deck } = await supabase
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();

  const metadata = (deck?.metadata as Record<string, unknown>) ?? {};
  const { error } = await supabase
    .from("decks")
    .update({
      metadata: { ...metadata, autoRefreshWeekly: enabled },
      updated_at: new Date().toISOString(),
    })
    .eq("id", deckId);

  if (error) return actionError(toPublicError(error));
  return { success: true as const, autoRefreshWeekly: enabled };
}

export async function getDeckChatHistory(deckId: string) {
  const { supabase } = await requireDeckAccess(deckId);
  const { data } = await supabase
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();

  const history =
    (data?.metadata as { chatHistory?: Array<{ role: string; content: string }> })
      ?.chatHistory ?? [];

  return { history };
}

export async function appendDeckChatHistory(
  deckId: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>
) {
  const { supabase } = await requireDeckEdit(deckId);
  const { data: deck } = await supabase
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();

  const metadata = (deck?.metadata as Record<string, unknown>) ?? {};
  const existing =
    (metadata.chatHistory as Array<{ role: string; content: string }>) ?? [];
  const merged = [...existing, ...messages].slice(-50);

  await supabase
    .from("decks")
    .update({
      metadata: { ...metadata, chatHistory: merged },
      updated_at: new Date().toISOString(),
    })
    .eq("id", deckId);

  return { success: true as const };
}
