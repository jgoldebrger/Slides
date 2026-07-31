import { AI_FEATURE_IDS, type AiFeatureId } from "@/lib/ai/feature-flags";

export const FEATURE_GROUP_DESCRIPTIONS: Record<string, string> = {
  intake: "Bring project updates in from Slack, Jira, email, voice, and documents.",
  generation: "Build deck briefs, outlines, and first-draft slide content.",
  editor: "Rewrite, validate, and refine slides while you edit.",
  present: "Present, narrate, and follow up after delivery.",
  org: "Cross-project memory, rollups, and org-wide patterns.",
  trust: "Citations, confidence signals, and governance for AI output.",
  other: "Additional capabilities not grouped elsewhere.",
};

export const AI_FEATURE_DESCRIPTIONS: Record<AiFeatureId, string> = {
  intake_slack: "Pull status updates from Slack channels into project intake.",
  intake_jira: "Sync issues, sprints, and status from Jira into updates.",
  intake_email: "Parse forwarded emails into structured project updates.",
  intake_ocr: "Extract text and metrics from screenshots and images.",
  intake_voice: "Transcribe voice memos into structured update fields.",
  intake_merge: "Merge multiple intake sources into a single update.",
  intake_gap_fill: "Detect missing fields and prompt you to complete them.",
  intake_interview: "Guided Q&A flow to capture a full status update.",
  intake_change_alerts: "Alert when intake data changes in meaningful ways.",
  intake_evidence: "Attach supporting evidence to intake claims.",
  gen_brief_wizard: "Step-by-step wizard to define deck goals and audience.",
  gen_outline_variants: "Generate several outline options to compare and pick from.",
  gen_slide_budget: "Enforce slide count and density limits during generation.",
  gen_story_arc: "Shape narrative flow and pacing across the deck.",
  gen_claim_proof: "Pair statements with supporting proof points.",
  gen_market_context: "Add relevant market or industry context to slides.",
  gen_tone_simulator: "Preview different writing tones before generating.",
  gen_exec_cut: "Produce a shorter executive-summary version of the deck.",
  gen_decision_highlighter: "Surface key decisions prominently in generated slides.",
  gen_constraints_regen: "Regenerate content while respecting custom constraints.",
  editor_rewrite_chips: "One-click rewrite suggestions for slide text.",
  editor_layout_why: "Explain why a particular slide layout was chosen.",
  editor_qa_autofix: "Automatically fix common slide quality issues.",
  editor_duplicate_detector: "Flag repeated or overlapping content across slides.",
  editor_metric_normalizer: "Standardize number formats and metric labels.",
  editor_rehearsal_qa: "Practice Q&A with AI-generated audience questions.",
  editor_fact_checker: "Flag claims that lack support or conflict with sources.",
  editor_image_placement: "Suggest where images fit best on each slide.",
  editor_brand_voice: "Apply your org brand voice to slide edits.",
  editor_ai_comments: "Inline AI suggestions as review comments on slides.",
  present_copilot: "Live assistant while presenting or rehearsing.",
  present_adaptive_tts: "Adaptive text-to-speech narration for playback.",
  present_audience_switch: "Tailor talking points for different audiences.",
  present_follow_up_email: "Draft a follow-up email after you present.",
  present_recording_delta: "Summarize what changed since the last recording.",
  present_live_qa: "Handle live audience questions during presentation.",
  present_highlight_reel: "Build a short highlights reel from the deck.",
  present_pace_score: "Score pacing and rhythm of your delivery.",
  present_ai_player: "Autonomous AI deck player with viewer Q&A on share links.",
  org_insight_library: "Reusable insight patterns extracted across projects.",
  org_portfolio_rollup: "Combine status from multiple projects into one view.",
  org_trend_over_time: "Track metrics and themes across update cycles.",
  org_risk_warning: "Early warnings when portfolio risks emerge.",
  org_style_transfer: "Apply successful deck styles across the org.",
  org_personas: "Audience persona profiles that guide generation.",
  org_changelog: "Org-wide changelog of deck and update changes.",
  org_brand_voice_train: "Train brand voice from your best deck examples.",
  trust_citations: "Show sources and citations for AI-generated content.",
  trust_confidence: "Display confidence indicators on AI outputs.",
  trust_hitl_gates: "Require human approval before sensitive AI actions.",
  trust_activity_timeline: "Audit log of AI actions across decks and projects.",
  trust_nl_settings: "Natural-language preferences that steer org-wide AI.",
};

export const FEATURE_GROUPS: Array<{
  id: string;
  label: string;
  match: (id: AiFeatureId) => boolean;
}> = [
  { id: "intake", label: "Intake", match: (id) => id.startsWith("intake_") },
  { id: "generation", label: "Generation", match: (id) => id.startsWith("gen_") },
  { id: "editor", label: "Editor", match: (id) => id.startsWith("editor_") },
  { id: "present", label: "Present", match: (id) => id.startsWith("present_") },
  { id: "org", label: "Org memory", match: (id) => id.startsWith("org_") },
  { id: "trust", label: "Trust", match: (id) => id.startsWith("trust_") },
];

export function humanizeFeatureId(id: string): string {
  return id
    .replace(/^addon_[a-o]_\d+_/, "")
    .replace(/^addon_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getFeatureDescription(id: string): string {
  return (
    AI_FEATURE_DESCRIPTIONS[id as AiFeatureId] ??
    "AI capability for your workspace."
  );
}

export function getFeatureGroupDescription(groupId: string): string {
  return FEATURE_GROUP_DESCRIPTIONS[groupId] ?? "";
}

export function groupCoreFeatures(ids: AiFeatureId[] = [...AI_FEATURE_IDS]) {
  const grouped = FEATURE_GROUPS.map((group) => ({
    ...group,
    features: ids.filter(group.match),
  }));
  const assigned = new Set(grouped.flatMap((g) => g.features));
  const other = ids.filter((id) => !assigned.has(id));
  if (other.length) {
    grouped.push({ id: "other", label: "Other", match: () => false, features: other });
  }
  return grouped.filter((g) => g.features.length > 0);
}
