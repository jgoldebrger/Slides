"use server";

import { revalidatePath } from "next/cache";
import { logAiActivity } from "@/lib/ai/activity";
import { isAiFeatureEnabled } from "@/lib/ai/feature-flags";
import { loadOrgAiPrefs } from "@/lib/ai/org-prefs";
import * as intake from "@/lib/ai/intake";
import * as generation from "@/lib/ai/generation";
import * as editor from "@/lib/ai/editor";
import * as present from "@/lib/ai/present";
import * as orgMemory from "@/lib/ai/org-memory";
import { analyzeProjectUpdates } from "@/lib/ai/analyze-project-updates";
import { contentFocusFromMetadata } from "@/lib/ai/load-deck-content-focus";
import { prepareProjectUpdatesForDeck } from "@/lib/ai/project-updates-context";
import {
  assertAiEntitlement,
  assertProjectEditor,
  assertUserTextSafe,
} from "@/lib/ai/guard-ai-action";
import {
  requireDeckEdit,
  requireDeckAccess,
  requireProjectAccess,
  requireOrgAdmin,
  getUserOrg,
} from "@/lib/permissions";
import { actionError, toPublicError } from "@/lib/errors/public-error";
import { checkHitlForGeneratedContent } from "@/lib/ai/hitl";
import type { DeckOutline, DeckType } from "@/types/slide";

async function guardFeature(
  supabase: Awaited<ReturnType<typeof requireDeckAccess>>["supabase"],
  orgId: string,
  featureId: Parameters<typeof isAiFeatureEnabled>[0]
) {
  const prefs = await loadOrgAiPrefs(supabase, orgId);
  if (!isAiFeatureEnabled(featureId, prefs.featureOverrides ?? null)) {
    throw new Error(`Feature ${featureId} is not enabled`);
  }
  return prefs;
}

async function guardAiFeature(
  supabase: Awaited<ReturnType<typeof requireDeckAccess>>["supabase"],
  orgId: string,
  featureId: Parameters<typeof isAiFeatureEnabled>[0],
  action: "generate" | "outline" = "generate"
) {
  const prefs = await guardFeature(supabase, orgId, featureId);
  await assertAiEntitlement(supabase, orgId, action);
  return prefs;
}

export async function runIntakeForProject(
  projectId: string,
  featureId: "intake_voice" | "intake_ocr" | "intake_slack" | "intake_jira" | "intake_email",
  text: string
) {
  try {
    const { supabase, user, project, role } = await requireProjectAccess(projectId);
    assertProjectEditor(role);
    assertUserTextSafe(text);
    const prefs = await guardAiFeature(supabase, project.org_id, featureId);
    const { data: existing } = await supabase
      .from("project_updates")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    let parsed;
    if (featureId === "intake_voice" || featureId === "intake_ocr") {
      parsed =
        featureId === "intake_voice"
          ? await intake.parseVoiceTranscriptToUpdates(project.name, text)
          : await intake.parseOcrTextToUpdates(project.name, text);
    } else if (featureId === "intake_slack") {
      parsed = await intake.parseSlackDigest(text, project.name);
    } else if (featureId === "intake_jira") {
      parsed = await intake.parseJiraExport(text, project.name);
    } else {
      parsed = await intake.parseEmailBody(text, project.name);
    }

    const hitl = checkHitlForGeneratedContent(
      prefs,
      parsed as Record<string, unknown>,
      (existing ?? {}) as Record<string, unknown>
    );
    if (!hitl.allowed) {
      return actionError(hitl.reason);
    }

    await logAiActivity(supabase, {
      orgId: project.org_id,
      userId: user.id,
      action: "intake.parse",
      featureId,
      summary: `Parsed ${featureId} into project updates`,
    });
    revalidatePath(`/projects/${projectId}/updates`);
    return { success: true as const, updates: parsed };
  } catch (err) {
    return actionError(toPublicError(err, "Intake failed"));
  }
}

export async function runGapFillSuggestions(projectId: string, deckType: DeckType) {
  try {
    const { supabase, user, project, role } = await requireProjectAccess(projectId);
    assertProjectEditor(role);
    const { data: updates } = await supabase
      .from("project_updates")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    await guardAiFeature(supabase, project.org_id, "intake_gap_fill");
    const result = await intake.suggestGapFillUpdates(
      project.name,
      updates ?? {},
      deckType
    );
    await logAiActivity(supabase, {
      orgId: project.org_id,
      userId: user.id,
      action: "intake.gap_fill",
      featureId: "intake_gap_fill",
      summary: "Suggested gap-fill drafts",
    });
    return { success: true as const, result };
  } catch (err) {
    return actionError(toPublicError(err, "Gap fill failed"));
  }
}

export async function runOutlineVariants(deckId: string) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);
  try {
    await guardAiFeature(supabase, deck.org_id, "gen_outline_variants", "outline");
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
    const contentFocus = contentFocusFromMetadata(
      deck.metadata,
      deck.type as DeckType,
      updates
    );
    const projectUpdates = prepareProjectUpdatesForDeck(
      updates,
      contentFocus.includedSections
    );
    const contentAnalysis = analyzeProjectUpdates(projectUpdates);
    const variants = await generation.generateOutlineVariants({
      deckType: deck.type as DeckType,
      projectName: project?.name ?? "Project",
      projectDescription: project?.description,
      updates: projectUpdates,
      includedSections: contentFocus.includedSections,
      deckBrief: contentFocus.deckBrief,
      contentAnalysis,
    });
    await logAiActivity(supabase, {
      orgId: deck.org_id,
      deckId,
      userId: user.id,
      action: "generation.outline_variants",
      featureId: "gen_outline_variants",
      summary: `Generated ${variants.length} outline variants`,
    });
    return { success: true as const, variants };
  } catch (err) {
    return actionError(toPublicError(err, "Outline variants failed"));
  }
}

export async function runSlideFactCheck(deckId: string, slideId: string) {
  const { supabase, deck } = await requireDeckAccess(deckId);
  try {
    await guardAiFeature(supabase, deck.org_id, "editor_fact_checker");
    const { data: slide } = await supabase
      .from("slides")
      .select("content, title")
      .eq("id", slideId)
      .single();
    const { data: updates } = await supabase
      .from("project_updates")
      .select("*")
      .eq("project_id", deck.project_id)
      .single();
    const result = await editor.factCheckSlideAgainstUpdates(
      JSON.stringify({ title: slide?.title, content: slide?.content }),
      updates ?? {}
    );
    return { success: true as const, result };
  } catch (err) {
    return actionError(toPublicError(err, "Fact check failed"));
  }
}

export async function runPaceScore(deckId: string) {
  const { supabase, deck } = await requireDeckAccess(deckId);
  try {
    await guardAiFeature(supabase, deck.org_id, "present_pace_score");
    const { data: slides } = await supabase
      .from("slides")
      .select("title, content, speaker_notes")
      .eq("deck_id", deckId)
      .order("order");
    const score = present.estimatePaceScore(slides ?? []);
    return { success: true as const, score };
  } catch (err) {
    return actionError(toPublicError(err, "Pace score failed"));
  }
}

export async function runFollowUpEmailDraft(deckId: string, notes?: string) {
  const { supabase, deck } = await requireDeckAccess(deckId);
  try {
    assertUserTextSafe(notes);
    await guardAiFeature(supabase, deck.org_id, "present_follow_up_email");
    const { data: slides } = await supabase
      .from("slides")
      .select("title, content")
      .eq("deck_id", deckId)
      .order("order");
    const draft = await present.draftFollowUpEmail(
      deck.name,
      slides ?? [],
      notes
    );
    return { success: true as const, draft };
  } catch (err) {
    return actionError(toPublicError(err, "Follow-up email failed"));
  }
}

export async function runHighlightReel(deckId: string) {
  const { supabase, deck } = await requireDeckAccess(deckId);
  try {
    await guardAiFeature(supabase, deck.org_id, "present_highlight_reel");
    const outline = deck.outline as { slides?: Array<{ title: string; summary?: string }> } | null;
    const reel = await present.pickHighlightReel(outline?.slides ?? []);
    return { success: true as const, reel };
  } catch (err) {
    return actionError(toPublicError(err, "Highlight reel failed"));
  }
}

export async function runRewriteChip(
  deckId: string,
  text: string,
  chip: "shorter" | "stronger" | "quantify" | "soften"
) {
  const { supabase, deck } = await requireDeckEdit(deckId);
  try {
    assertUserTextSafe(text);
    await guardAiFeature(supabase, deck.org_id, "editor_rewrite_chips");
    const rewritten = await editor.rewriteTextChip(text, chip);
    return { success: true as const, text: rewritten };
  } catch (err) {
    return actionError(toPublicError(err, "Rewrite failed"));
  }
}

export async function runPortfolioRollup(projectIds: string[]) {
  const { supabase, user, orgId } = await requireOrgAdmin();
  try {
    await guardAiFeature(supabase, orgId, "org_portfolio_rollup");
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds)
      .eq("org_id", orgId);
    const enriched = [];
    for (const p of projects ?? []) {
      const { data: updates } = await supabase
        .from("project_updates")
        .select("*")
        .eq("project_id", p.id)
        .maybeSingle();
      enriched.push({ name: p.name, updates: updates ?? {} });
    }
    const outline = await orgMemory.buildPortfolioRollup(enriched);
    await logAiActivity(supabase, {
      orgId,
      userId: user.id,
      action: "org.portfolio_rollup",
      featureId: "org_portfolio_rollup",
      summary: `Portfolio rollup for ${projectIds.length} projects`,
    });
    return { success: true as const, outline };
  } catch (err) {
    return actionError(toPublicError(err, "Portfolio rollup failed"));
  }
}

async function loadDeckContext(deckId: string) {
  const { supabase, deck } = await requireDeckAccess(deckId);
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
  const contentFocus = contentFocusFromMetadata(
    deck.metadata,
    deck.type as DeckType,
    updates
  );
  const projectUpdates = prepareProjectUpdatesForDeck(
    updates,
    contentFocus.includedSections
  );
  return {
    supabase,
    deck,
    project,
    updates,
    contentFocus,
    projectUpdates,
    contentAnalysis: analyzeProjectUpdates(projectUpdates),
  };
}

export async function runBriefWizard(
  audience: string,
  outcome: string,
  slideCount: number
) {
  try {
    const { supabase, orgId } = await getUserOrg();
    await guardAiFeature(supabase, orgId, "gen_brief_wizard", "outline");
    assertUserTextSafe(`${audience} ${outcome}`);
    const brief = await generation.buildBriefFromWizard({
      audience,
      outcome,
      slideCount,
    });
    return { success: true as const, brief };
  } catch (err) {
    return actionError(toPublicError(err, "Brief wizard failed"));
  }
}

export async function runSlideBudget(deckId: string, targetSlides: number) {
  const { supabase, deck } = await requireDeckEdit(deckId);
  try {
    await guardAiFeature(supabase, deck.org_id, "gen_slide_budget", "outline");
    const outline = deck.outline as DeckOutline | null;
    if (!outline) return actionError("No outline to compress");
    const compressed = await generation.compressOutlineToBudget(
      outline,
      targetSlides
    );
    return { success: true as const, outline: compressed };
  } catch (err) {
    return actionError(toPublicError(err, "Slide budget failed"));
  }
}

export async function runStoryArc(deckId: string) {
  const { supabase, deck } = await requireDeckAccess(deckId);
  try {
    await guardAiFeature(supabase, deck.org_id, "gen_story_arc", "outline");
    const outline = deck.outline as DeckOutline | null;
    if (!outline) return actionError("No outline");
    const arc = await generation.annotateStoryArc(outline);
    return { success: true as const, arc };
  } catch (err) {
    return actionError(toPublicError(err, "Story arc failed"));
  }
}

export async function runConstraintsRegen(deckId: string, constraints: string) {
  const { supabase, user, deck } = await requireDeckEdit(deckId);
  try {
    assertUserTextSafe(constraints);
    await guardAiFeature(supabase, deck.org_id, "gen_constraints_regen", "outline");
    const ctx = await loadDeckContext(deckId);
    const outline = deck.outline as DeckOutline | null;
    if (!outline) return actionError("No outline");
    const regenerated = await generation.regenerateWithConstraints(
      outline,
      constraints,
      ctx.projectUpdates,
      deck.type as DeckType
    );
    await logAiActivity(supabase, {
      orgId: deck.org_id,
      deckId,
      userId: user.id,
      action: "generation.constraints_regen",
      featureId: "gen_constraints_regen",
      summary: "Regenerated outline with constraints",
    });
    return { success: true as const, outline: regenerated };
  } catch (err) {
    return actionError(toPublicError(err, "Constraints regen failed"));
  }
}

export async function runInterviewTurn(
  projectId: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
) {
  try {
    const { supabase, user, project, role } = await requireProjectAccess(projectId);
    assertProjectEditor(role);
    assertUserTextSafe(userMessage);
    await guardAiFeature(supabase, project.org_id, "intake_interview");
    const turn = await intake.runInterviewTurn(
      project.name,
      history,
      userMessage
    );
    await logAiActivity(supabase, {
      orgId: project.org_id,
      userId: user.id,
      action: "intake.interview",
      featureId: "intake_interview",
      summary: turn.done ? "Interview complete" : "Interview turn",
    });
    return { success: true as const, turn };
  } catch (err) {
    return actionError(toPublicError(err, "Interview failed"));
  }
}

export async function runDuplicateDetection(deckId: string) {
  const { supabase, deck } = await requireDeckAccess(deckId);
  try {
    await guardAiFeature(supabase, deck.org_id, "editor_duplicate_detector");
    const { data: slides } = await supabase
      .from("slides")
      .select("title, content")
      .eq("deck_id", deckId)
      .order("order");
    const mapped = (slides ?? []).map((s) => ({
      title: s.title,
      body: JSON.stringify(s.content),
    }));
    const result = await editor.detectDuplicateSlides(mapped);
    return { success: true as const, result };
  } catch (err) {
    return actionError(toPublicError(err, "Duplicate detection failed"));
  }
}

export async function runRehearsalQa(deckId: string, slideId: string) {
  const { supabase, deck } = await requireDeckAccess(deckId);
  try {
    await guardAiFeature(supabase, deck.org_id, "editor_rehearsal_qa");
    const { data: slide } = await supabase
      .from("slides")
      .select("title, content")
      .eq("id", slideId)
      .single();
    const qa = await editor.generateRehearsalQa(
      slide?.title ?? "",
      JSON.stringify(slide?.content ?? {})
    );
    return { success: true as const, qa };
  } catch (err) {
    return actionError(toPublicError(err, "Rehearsal Q&A failed"));
  }
}

export async function runPresenterCopilot(
  deckId: string,
  slideIndex: number,
  remainingMinutes: number
) {
  const { supabase, deck } = await requireDeckAccess(deckId);
  try {
    await guardAiFeature(supabase, deck.org_id, "present_copilot");
    const { data: slides } = await supabase
      .from("slides")
      .select("title, content")
      .eq("deck_id", deckId)
      .order("order");
    const current = slides?.[slideIndex];
    if (!current) return actionError("Slide not found");
    const hints = await present.presenterCopilotHints(current, remainingMinutes);
    return { success: true as const, hints };
  } catch (err) {
    return actionError(toPublicError(err, "Presenter copilot failed"));
  }
}

export async function runLiveQa(deckId: string, question: string) {
  const { supabase, deck } = await requireDeckAccess(deckId);
  try {
    assertUserTextSafe(question);
    await guardAiFeature(supabase, deck.org_id, "present_live_qa");
    const { data: slides } = await supabase
      .from("slides")
      .select("title, content")
      .eq("deck_id", deckId)
      .order("order");
    const { data: updates } = await supabase
      .from("project_updates")
      .select("*")
      .eq("project_id", deck.project_id)
      .single();
    const answer = await present.liveQaFromDeck(
      question,
      slides ?? [],
      updates ?? {}
    );
    return { success: true as const, answer };
  } catch (err) {
    return actionError(toPublicError(err, "Live Q&A failed"));
  }
}

export async function runOrgInsightLibrary() {
  const { supabase, orgId } = await requireOrgAdmin();
  try {
    await guardAiFeature(supabase, orgId, "org_insight_library");
    const { data: decks } = await supabase
      .from("decks")
      .select("name, outline")
      .eq("org_id", orgId)
      .limit(20);
    const patterns = await orgMemory.extractOrgInsightPatterns(
      (decks ?? []).map((d) => ({ name: d.name, outline: d.outline }))
    );
    return { success: true as const, patterns };
  } catch (err) {
    return actionError(toPublicError(err, "Insight library failed"));
  }
}

export async function runRiskWarning(projectId: string) {
  const { supabase, project, role } = await requireProjectAccess(projectId);
  try {
    assertProjectEditor(role);
    await guardAiFeature(supabase, project.org_id, "org_risk_warning");
    const { data: current } = await supabase
      .from("project_updates")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();
    const meta = (current?.metadata ?? {}) as Record<string, unknown>;
    const history: Array<{ date: string; updates: Record<string, unknown> }> = [];
    if (meta.previousSnapshot) {
      history.push({
        date: "previous",
        updates: meta.previousSnapshot as Record<string, unknown>,
      });
    }
    if (current) {
      const { metadata: _m, ...rest } = current as Record<string, unknown>;
      history.push({
        date: new Date().toISOString(),
        updates: rest,
      });
    }
    const warning = await orgMemory.detectRisingRiskLanguage(history);
    return { success: true as const, warning };
  } catch (err) {
    return actionError(toPublicError(err, "Risk warning failed"));
  }
}
