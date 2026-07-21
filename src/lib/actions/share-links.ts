"use server";

import { revalidatePath } from "next/cache";
import { requireDeckEdit } from "@/lib/permissions";
import {
  generateShareToken,
  hashShareToken,
  shareViewUrl,
} from "@/lib/share/token";
import { actionError, toPublicError } from "@/lib/errors/public-error";
import { z } from "zod";

const createShareLinkOptionsSchema = z.object({
  label: z.string().max(100).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export async function createDeckShareLink(
  deckId: string,
  options?: { label?: string; expiresInDays?: number }
) {
  const parsedOptions = createShareLinkOptionsSchema.safeParse(options ?? {});
  if (!parsedOptions.success) return actionError("Invalid share link options");

  const { supabase, deck, user } = await requireDeckEdit(deckId);

  const token = generateShareToken();
  const tokenHash = hashShareToken(token);
  const expiresInDays = parsedOptions.data.expiresInDays ?? 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const { data, error } = await supabase
    .from("deck_share_links")
    .insert({
      deck_id: deckId,
      org_id: deck.org_id,
      token_hash: tokenHash,
      label: parsedOptions.data.label?.trim() || null,
      expires_at: expiresAt.toISOString(),
      created_by: user.id,
    })
    .select("id, label, expires_at, created_at")
    .single();

  if (error) return actionError(toPublicError(error));

  revalidatePath(`/decks/${deckId}/editor`);
  revalidatePath(`/decks/${deckId}/player`);

  return {
    success: true as const,
    link: data,
    url: shareViewUrl(token),
    // Token shown once — never stored in plaintext
    token,
  };
}

export async function listDeckShareLinks(deckId: string) {
  const { supabase } = await requireDeckEdit(deckId);

  const { data, error } = await supabase
    .from("deck_share_links")
    .select("id, label, expires_at, revoked_at, created_at")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: false });

  if (error) return actionError(toPublicError(error));
  return { success: true as const, links: data ?? [] };
}

export async function revokeDeckShareLink(deckId: string, linkId: string) {
  const { supabase } = await requireDeckEdit(deckId);

  const { error } = await supabase
    .from("deck_share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", linkId)
    .eq("deck_id", deckId)
    .is("revoked_at", null);

  if (error) return actionError(toPublicError(error));

  revalidatePath(`/decks/${deckId}/editor`);
  revalidatePath(`/decks/${deckId}/player`);
  return { success: true as const };
}
