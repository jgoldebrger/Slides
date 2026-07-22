"use server";

import { logAiActivity } from "@/lib/ai/activity";
import { isAiAddonEnabled } from "@/lib/ai/addon-flags";
import {
  runAddonById,
  type AddonRunContext,
  type AiAddonFeatureId,
  TOP_12_ADDON_IDS,
  AI_ADDON_CATALOG,
  addonsByCluster,
  type AiAddonCluster,
} from "@/lib/ai/addons";
import {
  assertAiEntitlement,
  assertProjectEditor,
  assertUserTextSafe,
} from "@/lib/ai/guard-ai-action";
import { loadOrgAiPrefs } from "@/lib/ai/org-prefs";
import { contentFocusFromMetadata } from "@/lib/ai/load-deck-content-focus";
import { prepareProjectUpdatesForDeck } from "@/lib/ai/project-updates-context";
import {
  requireDeckAccess,
  requireProjectAccess,
  requireOrgAdmin,
  getUserOrg,
} from "@/lib/permissions";
import { actionError, toPublicError } from "@/lib/errors/public-error";
import type { DeckType } from "@/types/slide";

async function guardAddon(
  supabase: Awaited<ReturnType<typeof requireDeckAccess>>["supabase"],
  orgId: string,
  featureId: AiAddonFeatureId
) {
  const prefs = await loadOrgAiPrefs(supabase, orgId);
  if (!isAiAddonEnabled(featureId, prefs.featureOverrides ?? null)) {
    throw new Error(`Addon ${featureId} is not enabled`);
  }
  await assertAiEntitlement(supabase, orgId, "generate");
  return prefs;
}

export async function listAiAddons(cluster?: AiAddonCluster) {
  const items = cluster ? addonsByCluster(cluster) : AI_ADDON_CATALOG;
  const { supabase, orgId } = await getUserOrg();
  const prefs = await loadOrgAiPrefs(supabase, orgId);
  const overrides = prefs.featureOverrides ?? null;
  const addons = items.map((addon) => ({
    ...addon,
    enabled: isAiAddonEnabled(
      addon.id as AiAddonFeatureId,
      overrides
    ),
    orgOverride: overrides != null && addon.id in overrides,
  }));
  return {
    addons,
    top12: TOP_12_ADDON_IDS,
    enabled: addons.filter((a) => a.enabled),
    stats: {
      enabled: addons.filter((a) => a.enabled).length,
      total: addons.length,
    },
  };
}

export async function runDeckAddon(
  deckId: string,
  featureId: AiAddonFeatureId,
  ctx: Omit<AddonRunContext, "outline" | "slides" | "updates"> & {
    text?: string;
    payload?: Record<string, unknown>;
  }
) {
  try {
    const { supabase, user, deck } = await requireDeckAccess(deckId);
    await guardAddon(supabase, deck.org_id, featureId);

    if (ctx.text) {
      assertUserTextSafe(ctx.text);
    }

    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", deck.project_id)
      .single();

    const { data: updates } = await supabase
      .from("project_updates")
      .select("*")
      .eq("project_id", deck.project_id)
      .single();

    const { data: slides } = await supabase
      .from("slides")
      .select("id, title, content, speaker_notes, order")
      .eq("deck_id", deckId)
      .order("order");

    const contentFocus = contentFocusFromMetadata(
      deck.metadata,
      deck.type as DeckType,
      updates
    );
    const projectUpdates = prepareProjectUpdatesForDeck(
      updates,
      contentFocus.includedSections
    );

    const meta = (updates?.metadata ?? {}) as Record<string, unknown>;
    const previousUpdates = meta.previousSnapshot as Record<string, unknown> | undefined;

    let twinCandidates: Array<{ deckName: string; title: string; body: string }> = [];
    if (featureId === "addon_j_46_slide_twin") {
      const { data: orgDecks } = await supabase
        .from("decks")
        .select("id, name")
        .eq("org_id", deck.org_id)
        .neq("id", deckId)
        .limit(10);
      for (const d of orgDecks ?? []) {
        const { data: orgSlides } = await supabase
          .from("slides")
          .select("title, content")
          .eq("deck_id", d.id)
          .limit(5);
        for (const s of orgSlides ?? []) {
          twinCandidates.push({
            deckName: d.name,
            title: s.title,
            body: JSON.stringify(s.content),
          });
        }
      }
    }

    const result = await runAddonById(featureId, {
      ...ctx,
      deckName: deck.name,
      projectName: project?.name,
      outline: deck.outline as AddonRunContext["outline"],
      updates: projectUpdates as Record<string, unknown>,
      previousUpdates,
      slides: slides ?? [],
      payload: {
        ...ctx.payload,
        candidates: twinCandidates,
      },
    });

    await logAiActivity(supabase, {
      orgId: deck.org_id,
      deckId,
      userId: user.id,
      action: `addon.${featureId}`,
      summary: `Ran addon ${featureId}`,
      metadata: { featureId },
    });

    return { success: true as const, result };
  } catch (err) {
    return actionError(toPublicError(err, "Addon failed"));
  }
}

export async function runProjectAddon(
  projectId: string,
  featureId: AiAddonFeatureId,
  text: string,
  payload?: Record<string, unknown>
) {
  try {
    const { supabase, user, project, role } = await requireProjectAccess(projectId);
    assertProjectEditor(role);
    await guardAddon(supabase, project.org_id, featureId);

    assertUserTextSafe(text);

    const { data: updates } = await supabase
      .from("project_updates")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    const result = await runAddonById(featureId, {
      projectName: project.name,
      projectId,
      text,
      updates: (updates ?? {}) as Record<string, unknown>,
      payload,
    });

    await logAiActivity(supabase, {
      orgId: project.org_id,
      userId: user.id,
      action: `addon.${featureId}`,
      summary: `Ran project addon ${featureId}`,
    });

    return { success: true as const, result };
  } catch (err) {
    return actionError(toPublicError(err, "Project addon failed"));
  }
}

export async function runOrgAddon(
  featureId: AiAddonFeatureId,
  text?: string,
  payload?: Record<string, unknown>
) {
  try {
    const { supabase, user, orgId } = await requireOrgAdmin();
    await guardAddon(supabase, orgId, featureId);

    if (text) {
      assertUserTextSafe(text);
    }

    let enriched = payload ?? {};
    if (featureId === "addon_l_63_exec_digest" || featureId === "addon_l_61_dependency_radar") {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name")
        .eq("org_id", orgId);
      const projectRows = [];
      const deckRows = [];
      for (const p of projects ?? []) {
        const { data: u } = await supabase
          .from("project_updates")
          .select("*")
          .eq("project_id", p.id)
          .maybeSingle();
        projectRows.push({
          name: p.name,
          blockers: u?.blockers,
          updates: u ?? {},
        });
        const { data: d } = await supabase
          .from("decks")
          .select("name, outline")
          .eq("project_id", p.id)
          .limit(3);
        deckRows.push(...(d ?? []));
      }
      enriched = {
        ...enriched,
        projects: projectRows,
        decks: deckRows,
        updatesList: projectRows.map((p) => p.updates),
      };
    }

    const result = await runAddonById(featureId, {
      text,
      payload: enriched,
      roster: (payload?.roster as string[]) ?? [],
    });

    await logAiActivity(supabase, {
      orgId,
      userId: user.id,
      action: `addon.${featureId}`,
      summary: `Ran org addon ${featureId}`,
    });

    return { success: true as const, result };
  } catch (err) {
    return actionError(toPublicError(err, "Org addon failed"));
  }
}

/** Convenience wrappers for top-12 add-ons */
export async function runTop12DeckAddon(
  deckId: string,
  featureId: (typeof TOP_12_ADDON_IDS)[number],
  text?: string,
  payload?: Record<string, unknown>
) {
  return runDeckAddon(deckId, featureId, { text, payload });
}
