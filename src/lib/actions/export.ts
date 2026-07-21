"use server";

import { revalidatePath } from "next/cache";
import { sendDeckEvent } from "@/lib/inngest/events";
import { assertDeckJobEntitlement } from "@/lib/deck-rate-limit";
import { requireDeckEdit, requireOrgEditor } from "@/lib/permissions";
import { actionError, toPublicError } from "@/lib/errors/public-error";

export async function startExport(deckId: string) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "export");
  } catch (err) {
    return actionError(toPublicError(err, "Rate limit exceeded"));
  }

  const { data: exportRow, error: exportError } = await supabase
    .from("exports")
    .insert({
      deck_id: deckId,
      org_id: deck.org_id,
      format: "pptx",
      status: "processing",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (exportError) return actionError(toPublicError(exportError));

  try {
    await sendDeckEvent("deck/export", {
      exportId: exportRow.id,
      deckId,
      orgId: deck.org_id,
    });
    revalidatePath(`/decks/${deckId}/export`);
    return {
      success: true,
      exportId: exportRow.id,
      status: "processing" as const,
    };
  } catch (err) {
    await supabase
      .from("exports")
      .update({
        status: "failed",
        error: "Failed to start export",
        updated_at: new Date().toISOString(),
      })
      .eq("id", exportRow.id);

    return actionError(toPublicError(err, "Failed to start export"));
  }
}

export async function getExportStatus(exportId: string) {
  const { supabase, orgId } = await requireOrgEditor();
  const { data } = await supabase
    .from("exports")
    .select("id, status, error, created_at")
    .eq("id", exportId)
    .eq("org_id", orgId)
    .single();

  if (!data) return actionError("Export not found");
  return {
    success: true as const,
    id: data.id,
    status: data.status,
    error: data.error as string | null,
    createdAt: data.created_at,
  };
}

export async function getExportDownloadUrl(exportId: string) {
  const { supabase, orgId } = await requireOrgEditor();
  const { data } = await supabase
    .from("exports")
    .select("storage_path, status")
    .eq("id", exportId)
    .eq("org_id", orgId)
    .single();

  if (!data?.storage_path || data.status !== "completed") {
    return actionError("Export not ready");
  }

  const { data: signed } = await supabase.storage
    .from("exports")
    .createSignedUrl(data.storage_path, 3600);

  return { success: true as const, url: signed?.signedUrl };
}
