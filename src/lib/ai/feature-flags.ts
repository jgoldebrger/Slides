/** Feature IDs map to the 50 AI enhancement catalog. Default off until integrate pass. */
export const AI_FEATURE_IDS = [
  "intake_slack",
  "intake_jira",
  "intake_email",
  "intake_ocr",
  "intake_voice",
  "intake_merge",
  "intake_gap_fill",
  "intake_interview",
  "intake_change_alerts",
  "intake_evidence",
  "gen_brief_wizard",
  "gen_outline_variants",
  "gen_slide_budget",
  "gen_story_arc",
  "gen_claim_proof",
  "gen_market_context",
  "gen_tone_simulator",
  "gen_exec_cut",
  "gen_decision_highlighter",
  "gen_constraints_regen",
  "editor_rewrite_chips",
  "editor_layout_why",
  "editor_qa_autofix",
  "editor_duplicate_detector",
  "editor_metric_normalizer",
  "editor_rehearsal_qa",
  "editor_fact_checker",
  "editor_image_placement",
  "editor_brand_voice",
  "editor_ai_comments",
  "present_copilot",
  "present_adaptive_tts",
  "present_audience_switch",
  "present_follow_up_email",
  "present_recording_delta",
  "present_live_qa",
  "present_highlight_reel",
  "present_pace_score",
  "org_insight_library",
  "org_portfolio_rollup",
  "org_trend_over_time",
  "org_risk_warning",
  "org_style_transfer",
  "org_personas",
  "org_changelog",
  "org_brand_voice_train",
  "trust_citations",
  "trust_confidence",
  "trust_hitl_gates",
  "trust_activity_timeline",
  "trust_nl_settings",
] as const;

export type AiFeatureId = (typeof AI_FEATURE_IDS)[number];

const ENV_PREFIX = "AI_FEATURE_";

function envFlag(id: AiFeatureId): boolean | undefined {
  const key = `${ENV_PREFIX}${id.toUpperCase()}`;
  const val = process.env[key];
  if (val === "1" || val === "true") return true;
  if (val === "0" || val === "false") return false;
  return undefined;
}

/** Global default: Wave 0 trust + Wave 1 features on; others via env/org override. */
const DEFAULT_ENABLED = new Set<AiFeatureId>([
  "trust_citations",
  "trust_confidence",
  "trust_activity_timeline",
  "trust_nl_settings",
  "trust_hitl_gates",
  "intake_voice",
  "intake_ocr",
  "intake_gap_fill",
  "intake_interview",
  "intake_evidence",
  "intake_change_alerts",
  "intake_slack",
  "intake_jira",
  "intake_email",
  "intake_merge",
  "gen_brief_wizard",
  "gen_outline_variants",
  "gen_slide_budget",
  "gen_constraints_regen",
  "gen_story_arc",
  "gen_claim_proof",
  "gen_tone_simulator",
  "gen_exec_cut",
  "gen_decision_highlighter",
  "gen_market_context",
  "editor_rewrite_chips",
  "editor_layout_why",
  "editor_qa_autofix",
  "editor_duplicate_detector",
  "editor_metric_normalizer",
  "editor_rehearsal_qa",
  "editor_fact_checker",
  "editor_image_placement",
  "editor_ai_comments",
  "present_pace_score",
  "present_follow_up_email",
  "present_highlight_reel",
  "present_copilot",
  "present_adaptive_tts",
  "present_audience_switch",
  "present_live_qa",
  "present_recording_delta",
  "org_personas",
  "org_changelog",
  "org_trend_over_time",
  "org_portfolio_rollup",
  "org_insight_library",
  "org_risk_warning",
  "org_style_transfer",
  "org_brand_voice_train",
  "editor_brand_voice",
]);

export function isAiFeatureEnabled(
  id: AiFeatureId,
  orgOverrides?: Record<string, boolean> | null
): boolean {
  if (orgOverrides && id in orgOverrides) {
    return Boolean(orgOverrides[id]);
  }
  const env = envFlag(id);
  if (env !== undefined) return env;
  return DEFAULT_ENABLED.has(id);
}

export function enabledAiFeatures(
  orgOverrides?: Record<string, boolean> | null
): AiFeatureId[] {
  return AI_FEATURE_IDS.filter((id) => isAiFeatureEnabled(id, orgOverrides));
}
