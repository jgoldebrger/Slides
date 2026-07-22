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
import { enabledAiFeatures, isAiFeatureEnabled, AI_FEATURE_IDS } from "@/lib/ai/feature-flags";
import { requireDeckAccess, requireOrgAdmin, getUserOrg } from "@/lib/permissions";
import { actionError, toPublicError } from "@/lib/errors/public-error";
import { isAiAddonEnabled } from "@/lib/ai/addon-flags";
import { AI_ADDON_CATALOG } from "@/lib/ai/addons/catalog";
import { humanizeFeatureId } from "@/lib/ai/feature-labels";

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

export async function getOrgAiFeatureCatalog() {
  const { supabase, orgId } = await getUserOrg();
  const prefs = await loadOrgAiPrefs(supabase, orgId);
  const overrides = prefs.featureOverrides ?? null;

  const coreFeatures = AI_FEATURE_IDS.map((id) => ({
    id,
    label: humanizeFeatureId(id),
    enabled: isAiFeatureEnabled(id, overrides),
    orgOverride: overrides != null && id in overrides,
  }));

  const addons = AI_ADDON_CATALOG.map((addon) => ({
    id: addon.id,
    num: addon.num,
    cluster: addon.cluster,
    label: addon.label,
    enabled: isAiAddonEnabled(addon.id as Parameters<typeof isAiAddonEnabled>[0], overrides),
    orgOverride: overrides != null && addon.id in overrides,
  }));

  return {
    prefs,
    coreFeatures,
    addons,
    stats: {
      coreEnabled: coreFeatures.filter((f) => f.enabled).length,
      coreTotal: coreFeatures.length,
      addonEnabled: addons.filter((a) => a.enabled).length,
      addonTotal: addons.length,
    },
  };
}

export async function setOrgAiFeatureEnabled(featureId: string, enabled: boolean) {
  const { supabase, orgId } = await requireOrgAdmin();
  try {
    const prefs = await loadOrgAiPrefs(supabase, orgId);
    const featureOverrides = { ...(prefs.featureOverrides ?? {}), [featureId]: enabled };
    await saveOrgAiPrefs(supabase, orgId, { ...prefs, featureOverrides });
    revalidatePath("/settings");
    return { success: true as const, featureId, enabled };
  } catch (err) {
    return actionError(toPublicError(err, "Failed to update feature"));
  }
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
