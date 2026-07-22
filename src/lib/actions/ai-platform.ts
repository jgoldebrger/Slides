"use server";

import { revalidatePath } from "next/cache";
import { listAiActivity } from "@/lib/ai/activity";
import { assertUserTextSafe } from "@/lib/ai/guard-ai-action";
import {
  loadOrgAiPrefs,
  parseNaturalLanguageAiPrefs,
  saveOrgAiPrefs,
  type OrgAiPrefs,
} from "@/lib/ai/org-prefs";
import { enabledAiFeatures } from "@/lib/ai/feature-flags";
import { requireDeckAccess, requireOrgAdmin, getUserOrg } from "@/lib/permissions";
import { actionError, toPublicError } from "@/lib/errors/public-error";

export async function getDeckAiActivity(deckId: string) {
  const { supabase, deck } = await requireDeckAccess(deckId);
  const entries = await listAiActivity(supabase, {
    orgId: deck.org_id,
    deckId,
    limit: 30,
  });
  return { entries };
}

export async function getOrgAiPrefs() {
  const { supabase, orgId } = await getUserOrg();
  const prefs = await loadOrgAiPrefs(supabase, orgId);
  const features = enabledAiFeatures(prefs.featureOverrides ?? null);
  return { prefs, features };
}

export async function updateOrgAiPrefs(prefs: OrgAiPrefs) {
  const { supabase, orgId } = await requireOrgAdmin();
  try {
    await saveOrgAiPrefs(supabase, orgId, prefs);
    revalidatePath("/settings");
    return { success: true as const };
  } catch (err) {
    return actionError(toPublicError(err, "Failed to save AI preferences"));
  }
}

export async function getOrgProjectsForPortfolio() {
  const { supabase, orgId } = await requireOrgAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("org_id", orgId)
    .order("name");
  if (error) return actionError(toPublicError(error));
  return { projects: data ?? [] };
}

export async function updateOrgAiPrefsFromNaturalLanguage(instruction: string) {
  const trimmed = instruction.trim();
  if (!trimmed) {
    return actionError("Enter AI preferences before saving.");
  }

  const { supabase, orgId } = await requireOrgAdmin();
  try {
    assertUserTextSafe(trimmed);
    const existing = await loadOrgAiPrefs(supabase, orgId);
    const merged = await parseNaturalLanguageAiPrefs(trimmed, existing);
    await saveOrgAiPrefs(supabase, orgId, merged);
    revalidatePath("/settings");
    return { success: true as const, prefs: merged };
  } catch (err) {
    if (err instanceof Error && err.message.includes("permission")) {
      return actionError("You do not have permission to update org AI settings.");
    }
    return actionError(toPublicError(err, "Failed to save AI preferences"));
  }
}
