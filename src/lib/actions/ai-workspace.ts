"use server";

import { revalidatePath } from "next/cache";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { logAiActivity, listAiActivity } from "@/lib/ai/activity";
import { inferConfidenceFromCitations } from "@/lib/ai/confidence";
import { contentFocusFromMetadata } from "@/lib/ai/load-deck-content-focus";
import { normalizeProjectUpdatesForAi, prepareProjectUpdatesForDeck } from "@/lib/ai/project-updates-context";
import { runOutlineVariants } from "@/lib/actions/ai-features";
import { rewriteSlide } from "@/lib/actions/decks";
import { sendDeckChatMessage } from "@/lib/actions/deck-chat";
import { assertDeckJobEntitlement } from "@/lib/deck-rate-limit";
import { actionError, toPublicError } from "@/lib/errors/public-error";
import {
  requireDeckAccess,
  requireDeckEdit,
  requireOrgAdmin,
  getUserOrg,
} from "@/lib/permissions";
import {
  parseDeckMetadata,
  type DeckMetadata,
} from "@/lib/validations/deck-metadata";
import {
  agentConfigSchema,
  aiFeedbackSchema,
  connectorConfigSchema,
  COPILOT_MODES,
  promptLibraryEntrySchema,
  scopedRegenerateSchema,
  type AgentType,
  type ConnectorType,
  type CopilotMode,
  type ContextSnapshot,
} from "@/lib/ai/workspace/types";
import { SLASH_COMMANDS } from "@/lib/ai/workspace/copilot";
import type { DeckType } from "@/types/slide";

async function updateDeckMetadata(
  supabase: Awaited<ReturnType<typeof requireDeckEdit>>["supabase"],
  deckId: string,
  patch: Partial<DeckMetadata>
) {
  const { data } = await supabase
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();
  const current = parseDeckMetadata(data?.metadata);
  const next = { ...current, ...patch };
  await supabase.from("decks").update({ metadata: next }).eq("id", deckId);
  return next;
}

export async function getCopilotSettings(deckId: string) {
  const { supabase } = await requireDeckAccess(deckId);
  const { data } = await supabase
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();
  const meta = parseDeckMetadata(data?.metadata);
  return {
    mode: meta.copilotMode ?? "edit",
    pinnedInstructions: meta.pinnedInstructions ?? "",
    toolTraces: meta.lastToolTraces ?? [],
  };
}

export async function setCopilotMode(deckId: string, mode: CopilotMode) {
  if (!COPILOT_MODES.includes(mode)) return actionError("Invalid copilot mode");
  const { supabase } = await requireDeckEdit(deckId);
  await updateDeckMetadata(supabase, deckId, { copilotMode: mode });
  revalidatePath(`/decks/${deckId}/editor`);
  return { success: true as const, mode };
}

export async function setPinnedInstructions(deckId: string, instructions: string) {
  const trimmed = instructions.trim().slice(0, 2000);
  const { supabase } = await requireDeckEdit(deckId);
  await updateDeckMetadata(supabase, deckId, {
    pinnedInstructions: trimmed || undefined,
  });
  revalidatePath(`/decks/${deckId}/editor`);
  return { success: true as const };
}

export async function getDeckContextInspector(deckId: string) {
  const { supabase, deck } = await requireDeckAccess(deckId);
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
  const { count: slideCount } = await supabase
    .from("slides")
    .select("*", { count: "exact", head: true })
    .eq("deck_id", deckId);

  const meta = parseDeckMetadata(deck.metadata);
  const contentFocus = contentFocusFromMetadata(
    deck.metadata,
    deck.type as DeckType,
    updates
  );
  const prepared = prepareProjectUpdatesForDeck(
    updates,
    contentFocus.includedSections
  );
  const updateFields = Object.keys(prepared).filter(
    (k) => prepared[k as keyof typeof prepared] != null
  );

  const snapshot: ContextSnapshot = {
    capturedAt: new Date().toISOString(),
    projectName: project?.name,
    includedSections: contentFocus.includedSections,
    deckBrief: contentFocus.deckBrief,
    slideCount: slideCount ?? 0,
    updateFields,
    promptExcerpt: meta.pinnedInstructions,
  };

  return {
    snapshot,
    freshnessDays: updates?.updated_at
      ? Math.floor(
          (Date.now() - new Date(updates.updated_at).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null,
  };
}

export async function saveContextSnapshot(deckId: string) {
  const { supabase } = await requireDeckEdit(deckId);
  const { snapshot } = await getDeckContextInspector(deckId);
  await updateDeckMetadata(supabase, deckId, {
    lastContextSnapshot: snapshot,
  });
  return { success: true as const, snapshot };
}

export async function getSlideCitations(deckId: string, slideId: string) {
  const { supabase } = await requireDeckAccess(deckId);
  const { data } = await supabase
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();
  const meta = parseDeckMetadata(data?.metadata);
  return { citations: meta.slideCitations?.[slideId] ?? [] };
}

export async function generateSlideCitations(deckId: string, slideId: string) {
  const { supabase, deck } = await requireDeckEdit(deckId);
  const { data: slide } = await supabase
    .from("slides")
    .select("title, content, order")
    .eq("id", slideId)
    .eq("deck_id", deckId)
    .single();
  if (!slide) return actionError("Slide not found");

  const { data: updates } = await supabase
    .from("project_updates")
    .select("*")
    .eq("project_id", deck.project_id)
    .single();

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: z.object({
        citations: z.array(
          z.object({
            field: z.string(),
            excerpt: z.string().max(500),
          })
        ),
      }),
      prompt: `Map claims in this slide to project update fields.
Slide: ${JSON.stringify({ title: slide.title, content: slide.content })}
Updates: ${JSON.stringify(normalizeProjectUpdatesForAi(updates ?? {}))}
Return citations for factual claims only.`,
    });

    const meta = parseDeckMetadata(deck.metadata);
    const slideCitations = {
      ...(meta.slideCitations ?? {}),
      [slideId]: object.citations,
    };
    await updateDeckMetadata(supabase, deckId, { slideCitations });

    const confidence = inferConfidenceFromCitations(
      object.citations.length,
      Math.max(1, slide.order + 1)
    );

    revalidatePath(`/decks/${deckId}/editor`);
    return { success: true as const, citations: object.citations, confidence };
  } catch (err) {
    return actionError(toPublicError(err, "Citation generation failed"));
  }
}

export async function sendCopilotMessage(
  deckId: string,
  message: string,
  options?: {
    confirmDeletes?: boolean;
    slideId?: string;
    abortSignal?: never;
  }
) {
  const trimmed = message.trim();
  if (!trimmed) return actionError("Enter a message");

  const { supabase, deck } = await requireDeckEdit(deckId);
  const meta = parseDeckMetadata(deck.metadata);

  let resolvedMessage = trimmed;
  if (trimmed.startsWith("/")) {
    const cmd = trimmed.split(/\s+/)[0]!.toLowerCase();
    const base = SLASH_COMMANDS[cmd];
    if (base) {
      const rest = trimmed.slice(cmd.length).trim();
      resolvedMessage = rest ? `${base} ${rest}` : base;
    }
  }

  if (resolvedMessage.includes("@slide-")) {
    const match = resolvedMessage.match(/@slide-(\d+)/);
    if (match) {
      resolvedMessage = resolvedMessage.replace(
        `@slide-${match[1]}`,
        `(focus on slide ${match[1]})`
      );
    }
  }

  const modePrefix =
    meta.copilotMode && meta.copilotMode !== "edit"
      ? `[${meta.copilotMode} mode] `
      : "";
  const pinned = meta.pinnedInstructions
    ? `\nStanding instructions: ${meta.pinnedInstructions}`
    : "";

  const result = await sendDeckChatMessage(
    deckId,
    `${modePrefix}${resolvedMessage}${pinned}`,
    { confirmDeletes: options?.confirmDeletes }
  );

  if ("reply" in result && result.reply) {
    const traces = [
      ...(meta.lastToolTraces ?? []).slice(-9),
      ...((result.actionResults ?? []).map((a) => ({
        action: a.type,
        target: a.slideId,
        summary: a.message,
        at: new Date().toISOString(),
      })) ?? []),
    ];
    await updateDeckMetadata(supabase, deckId, { lastToolTraces: traces });
    await saveContextSnapshot(deckId);
  }

  if ("reply" in result) {
  const suggestions = buildCopilotSuggestions(meta.copilotMode ?? "edit");
  return { ...result, suggestions };
  }

  return result;
}

function buildCopilotSuggestions(mode: CopilotMode): string[] {
  switch (mode) {
    case "plan":
      return ["Outline risks section", "Add metrics slide", "Suggest story arc"];
    case "present":
      return ["Generate speaker notes", "Pace check", "Highlight reel"];
    case "research":
      return ["Fact check slide", "Show context used", "Find contradictions"];
    default:
      return ["Tighten risks", "Make slide shorter", "Run deck QA"];
  }
}

export async function runScopedRegenerate(payload: unknown) {
  const parsed = scopedRegenerateSchema.safeParse(payload);
  if (!parsed.success) return actionError("Invalid regenerate request");

  const { deckId, slideId, scope, instruction, keepEdits } = parsed.data;
  const { supabase, deck, user } = await requireDeckEdit(deckId);

  try {
    await assertDeckJobEntitlement(supabase, deck.org_id, "generate");
  } catch (err) {
    return actionError(toPublicError(err, "AI is not available"));
  }

  if (scope === "deck") {
    const { refreshSlidesFromUpdates } = await import("@/lib/actions/decks");
    return refreshSlidesFromUpdates(deckId);
  }

  if (!slideId) return actionError("Slide required for this scope");

  const { data: slide } = await supabase
    .from("slides")
    .select("id, order, title, layout, content")
    .eq("id", slideId)
    .eq("deck_id", deckId)
    .single();
  if (!slide) return actionError("Slide not found");

  const rewriteInstructions = [
    scope === "slide" ? "Regenerate this entire slide." : "",
    scope === "bullet" ? "Regenerate only the bullet points." : "",
    scope === "claim" ? "Regenerate unsupported claims only." : "",
    scope === "section" ? "Regenerate this section of the deck." : "",
    instruction ? `Instruction: ${instruction}` : "",
    keepEdits ? "Preserve human-edited regions where possible." : "",
  ]
    .filter(Boolean)
    .join(" ");

  const result = await rewriteSlide(slideId, deckId, rewriteInstructions);
  if ("error" in result && result.error) {
    return actionError(result.error);
  }

  await logAiActivity(supabase, {
    orgId: deck.org_id,
    deckId,
    slideId,
    userId: user.id,
    action: "editor.scoped_regenerate",
    summary: `Scoped regenerate (${scope})`,
    metadata: { scope, instruction, keepEdits },
  });

  revalidatePath(`/decks/${deckId}/editor`);
  return result;
}

export async function storeOutlineVariants(deckId: string) {
  const result = await runOutlineVariants(deckId);
  if ("error" in result && result.error) return result;
  if (!("variants" in result)) return actionError("No variants returned");

  const { supabase } = await requireDeckEdit(deckId);
  await updateDeckMetadata(supabase, deckId, {
    pendingVariants: result.variants.map((v) => ({
      strategy: v.strategy,
      outline: v.outline,
    })),
  });
  revalidatePath(`/decks/${deckId}/outline`);
  return { success: true as const, variants: result.variants };
}

export async function applyOutlineVariant(deckId: string, strategy: string) {
  const { supabase, deck } = await requireDeckEdit(deckId);
  const meta = parseDeckMetadata(deck.metadata);
  const variant = meta.pendingVariants?.find((v) => v.strategy === strategy);
  if (!variant) return actionError("Variant not found");

  await supabase
    .from("decks")
    .update({ outline: variant.outline, status: "outline" })
    .eq("id", deckId);

  await updateDeckMetadata(supabase, deckId, { pendingVariants: undefined });
  revalidatePath(`/decks/${deckId}/outline`);
  return { success: true as const };
}

export async function rollbackLastAiChange(deckId: string) {
  const { supabase } = await requireDeckEdit(deckId);
  const { data: revisions } = await supabase
    .from("deck_revisions")
    .select("id, reason, created_at")
    .eq("deck_id", deckId)
    .in("reason", ["regenerate", "refresh", "audience_variant"])
    .order("created_at", { ascending: false })
    .limit(2);

  if (!revisions || revisions.length < 2) {
    return actionError("No AI revision to roll back to");
  }

  const target = revisions[1]!;
  const { restoreDeckRevision } = await import("@/lib/actions/revisions");
  return restoreDeckRevision(deckId, target.id);
}

// --- Wave 2: History, feedback, prompts ---

export async function listOrgAiHistory(opts?: {
  deckId?: string;
  limit?: number;
}) {
  const { supabase, orgId } = await getUserOrg();
  const [activity, generations, feedback] = await Promise.all([
    listAiActivity(supabase, {
      orgId,
      deckId: opts?.deckId,
      limit: opts?.limit ?? 50,
    }),
    supabase
      .from("ai_generations")
      .select("id, deck_id, model, tokens, status, created_at, prompt_hash")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(opts?.limit ?? 50)
      .then((r) => r.data ?? []),
    supabase
      .from("ai_feedback")
      .select("id, deck_id, rating, feature_id, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then((r) => r.data ?? []),
  ]);

  return { activity, generations, feedback };
}

export async function submitAiFeedback(payload: unknown) {
  const parsed = aiFeedbackSchema.safeParse(payload);
  if (!parsed.success) return actionError("Invalid feedback");

  const { supabase, orgId, user } = await getUserOrg();
  const { error } = await supabase.from("ai_feedback").insert({
    org_id: orgId,
    user_id: user.id,
    deck_id: parsed.data.deckId ?? null,
    slide_id: parsed.data.slideId ?? null,
    generation_id: parsed.data.generationId ?? null,
    feature_id: parsed.data.featureId ?? null,
    rating: parsed.data.rating,
    correction: parsed.data.correction ?? null,
  });
  if (error) return actionError(toPublicError(error));
  return { success: true as const };
}

export async function listPromptLibrary() {
  const { supabase, orgId, user } = await getUserOrg();
  const { data, error } = await supabase
    .from("ai_prompt_library")
    .select("*")
    .eq("org_id", orgId)
    .or(`scope.eq.org,user_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });
  if (error) return actionError(toPublicError(error));
  return { prompts: data ?? [] };
}

export async function savePromptLibraryEntry(payload: unknown) {
  const parsed = promptLibraryEntrySchema.safeParse(payload);
  if (!parsed.success) return actionError("Invalid prompt");

  const { supabase, orgId, user } = await getUserOrg();
  const { data, error } = await supabase
    .from("ai_prompt_library")
    .insert({
      org_id: orgId,
      user_id: user.id,
      name: parsed.data.name,
      body: parsed.data.body,
      tags: parsed.data.tags ?? [],
      scope: parsed.data.scope,
    })
    .select("id")
    .single();
  if (error) return actionError(toPublicError(error));
  revalidatePath("/ai-history");
  return { success: true as const, id: data.id };
}

export async function togglePromptFavorite(promptId: string, favorite: boolean) {
  const { supabase, orgId } = await getUserOrg();
  const { error } = await supabase
    .from("ai_prompt_library")
    .update({ is_favorite: favorite, updated_at: new Date().toISOString() })
    .eq("id", promptId)
    .eq("org_id", orgId);
  if (error) return actionError(toPublicError(error));
  revalidatePath("/ai-history");
  return { success: true as const };
}

// --- Wave 3: Agents & cost ---

const DEFAULT_AGENTS: Array<{ agent_type: AgentType; name: string; schedule_cron: string }> = [
  { agent_type: "friday", name: "Friday Deck Agent", schedule_cron: "0 14 * * 5" },
  { agent_type: "refresh", name: "Refresh Agent", schedule_cron: "0 9 * * 1" },
  { agent_type: "approval", name: "Approval Agent", schedule_cron: "" },
  { agent_type: "risk_watch", name: "Risk Watch Agent", schedule_cron: "0 8 * * *" },
  { agent_type: "brand_drift", name: "Brand Drift Agent", schedule_cron: "0 10 * * 1" },
];

export async function ensureDefaultAgents() {
  const { supabase, orgId } = await requireOrgAdmin();
  for (const agent of DEFAULT_AGENTS) {
    await supabase.from("ai_agents").upsert(
      {
        org_id: orgId,
        agent_type: agent.agent_type,
        name: agent.name,
        schedule_cron: agent.schedule_cron || null,
        enabled: agent.agent_type === "refresh",
      },
      { onConflict: "org_id,agent_type" }
    );
  }
}

export async function listAiAgents() {
  const { supabase, orgId } = await requireOrgAdmin();
  await ensureDefaultAgents();

  const { data: agents } = await supabase
    .from("ai_agents")
    .select("*")
    .eq("org_id", orgId)
    .order("agent_type");

  const agentIds = (agents ?? []).map((a) => a.id);
  const { data: runs } = agentIds.length
    ? await supabase
        .from("ai_agent_runs")
        .select("*")
        .in("agent_id", agentIds)
        .order("started_at", { ascending: false })
        .limit(50)
    : { data: [] };

  return { agents: agents ?? [], runs: runs ?? [] };
}

export async function updateAiAgent(
  agentType: AgentType,
  payload: unknown
) {
  const parsed = agentConfigSchema.safeParse(payload);
  if (!parsed.success) return actionError("Invalid agent config");

  const { supabase, orgId } = await requireOrgAdmin();
  const { error } = await supabase
    .from("ai_agents")
    .update({
      enabled: parsed.data.enabled,
      schedule_cron: parsed.data.scheduleCron ?? null,
      budget_runs_per_week: parsed.data.budgetRunsPerWeek ?? null,
      config: parsed.data.config ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId)
    .eq("agent_type", agentType);
  if (error) return actionError(toPublicError(error));
  revalidatePath("/agents");
  return { success: true as const };
}

export async function runAiAgent(agentType: AgentType, deckId?: string) {
  const { supabase, orgId } = await requireOrgAdmin();
  const { data: agent } = await supabase
    .from("ai_agents")
    .select("id, name, budget_runs_per_week")
    .eq("org_id", orgId)
    .eq("agent_type", agentType)
    .single();
  if (!agent) return actionError("Agent not found");

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("ai_agent_runs")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", agent.id)
    .gte("started_at", weekAgo);

  if (agent.budget_runs_per_week && (count ?? 0) >= agent.budget_runs_per_week) {
    return actionError("Weekly agent run budget exceeded");
  }

  const steps = [
    { step: "start", at: new Date().toISOString(), message: `Running ${agent.name}` },
  ];

  const status =
    agentType === "approval" ? "awaiting_approval" : "running";

  const { data: run, error } = await supabase
    .from("ai_agent_runs")
    .insert({
      org_id: orgId,
      agent_id: agent.id,
      deck_id: deckId ?? null,
      status,
      steps,
      summary: `${agent.name} started`,
    })
    .select("id")
    .single();
  if (error) return actionError(toPublicError(error));

  if (agentType === "refresh" && deckId) {
    const { refreshSlidesFromUpdates } = await import("@/lib/actions/decks");
    await refreshSlidesFromUpdates(deckId);
    steps.push({
      step: "refresh",
      at: new Date().toISOString(),
      message: "Enqueued deck refresh",
    });
  }

  await supabase
    .from("ai_agent_runs")
    .update({
      status: agentType === "approval" ? "awaiting_approval" : "completed",
      steps,
      summary: `${agent.name} completed`,
      completed_at: new Date().toISOString(),
    })
    .eq("id", run.id);

  revalidatePath("/agents");
  return { success: true as const, runId: run.id };
}

export async function getAiCostSummary() {
  const { supabase, orgId } = await requireOrgAdmin();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("ai_generations")
    .select("tokens, deck_id, created_at")
    .eq("org_id", orgId)
    .gte("created_at", monthStart.toISOString());

  const totalTokens = (data ?? []).reduce((sum, row) => sum + (row.tokens ?? 0), 0);
  const estimatedCostUsd = (totalTokens / 1_000_000) * 0.15;

  const byDeck = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.deck_id) continue;
    byDeck.set(row.deck_id, (byDeck.get(row.deck_id) ?? 0) + (row.tokens ?? 0));
  }

  return {
    totalTokens,
    estimatedCostUsd,
    generationCount: data?.length ?? 0,
    topDecks: [...byDeck.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([deckId, tokens]) => ({ deckId, tokens })),
  };
}

// --- Wave 4: Connectors & present modes ---

export async function listAiConnectors() {
  const { supabase, orgId } = await requireOrgAdmin();
  const types: ConnectorType[] = ["slack", "jira", "linear", "email", "github", "notion"];

  for (const connector_type of types) {
    await supabase.from("ai_connectors").upsert(
      {
        org_id: orgId,
        connector_type,
        name: connector_type.charAt(0).toUpperCase() + connector_type.slice(1),
        enabled: false,
      },
      { onConflict: "org_id,connector_type" }
    );
  }

  const { data } = await supabase
    .from("ai_connectors")
    .select("*")
    .eq("org_id", orgId)
    .order("connector_type");
  return { connectors: data ?? [] };
}

export async function updateAiConnector(
  connectorType: ConnectorType,
  payload: unknown
) {
  const parsed = connectorConfigSchema.safeParse(payload);
  if (!parsed.success) return actionError("Invalid connector config");

  const { supabase, orgId } = await requireOrgAdmin();
  const { error } = await supabase
    .from("ai_connectors")
    .update({
      enabled: parsed.data.enabled,
      name: parsed.data.name,
      config: parsed.data.config ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("org_id", orgId)
    .eq("connector_type", connectorType);
  if (error) return actionError(toPublicError(error));
  revalidatePath("/settings");
  return { success: true as const };
}

export async function ingestConnectorPayload(
  connectorType: ConnectorType,
  projectId: string,
  text: string
) {
  const { runIntakeForProject } = await import("@/lib/actions/ai-features");
  const featureMap: Record<ConnectorType, Parameters<typeof runIntakeForProject>[1]> = {
    slack: "intake_slack",
    jira: "intake_jira",
    email: "intake_email",
    linear: "intake_jira",
    github: "intake_email",
    notion: "intake_email",
  };
  return runIntakeForProject(projectId, featureMap[connectorType], text);
}

export async function getPresentModeScript(
  deckId: string,
  slideIndex: number,
  mode: "teleprompter" | "pace_coach" | "async_video"
) {
  const { supabase } = await requireDeckAccess(deckId);
  const { data: slides } = await supabase
    .from("slides")
    .select("title, speaker_notes, content")
    .eq("deck_id", deckId)
    .order("order");

  const slide = slides?.[slideIndex];
  if (!slide) return actionError("Slide not found");

  const notes = slide.speaker_notes || slide.title;
  if (mode === "teleprompter") {
    return { success: true as const, script: notes, mode };
  }

  if (mode === "pace_coach") {
    const wordCount = notes.split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(wordCount / 130));
    return {
      success: true as const,
      script: notes,
      mode,
      paceHint:
        minutes > 3
          ? "Slow down — this slide may run long."
          : "Good pace for this slide.",
    };
  }

  const chapters = (slides ?? []).map((s, i) => ({
    index: i,
    title: s.title,
    timestamp: `${i * 45}s`,
  }));
  return {
    success: true as const,
    script: notes,
    mode,
    chapters,
  };
}
