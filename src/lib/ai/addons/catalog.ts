/** Net-new 100 AI add-ons (clusters G–O). IDs 1–100 map to plan catalog. */
export const AI_ADDON_CLUSTERS = [
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
] as const;

export type AiAddonCluster = (typeof AI_ADDON_CLUSTERS)[number];

export type AiAddonMeta = {
  id: string;
  num: number;
  cluster: AiAddonCluster;
  label: string;
};

function addon(
  num: number,
  cluster: AiAddonCluster,
  slug: string,
  label: string
): AiAddonMeta {
  const id = `addon_${cluster.toLowerCase()}_${String(num).padStart(2, "0")}_${slug}`;
  return { id, num, cluster, label };
}

export const AI_ADDON_CATALOG: AiAddonMeta[] = [
  // G — Intake (1–12)
  addon(1, "G", "screenshot_metrics", "Screenshot → metrics OCR"),
  addon(2, "G", "figma_paste", "Figma / FigJam paste"),
  addon(3, "G", "wiki_import", "Confluence / Notion import"),
  addon(4, "G", "csv_metrics", "CSV / Sheets metrics sync"),
  addon(5, "G", "calendar_parse", "Calendar invite parse"),
  addon(6, "G", "prd_rfc", "PRD / RFC ingest"),
  addon(7, "G", "quote_bank", "Customer quote bank"),
  addon(8, "G", "incident_digest", "Incident ticket digest"),
  addon(9, "G", "okr_import", "OKR check-in import"),
  addon(10, "G", "multi_project_split", "Multi-project paste splitter"),
  addon(11, "G", "lang_detect", "Language-detect intake"),
  addon(12, "G", "evidence_locker", "Evidence locker"),
  // H — Narrative (13–24)
  addon(13, "H", "stakeholder_map", "Stakeholder map slide"),
  addon(14, "H", "hypothesis_bet", "Hypothesis / bet framing"),
  addon(15, "H", "anti_slide", "Anti-slide detector"),
  addon(16, "H", "timeline_layout", "Timeline auto-layout"),
  addon(17, "H", "contrast_slide", "Contrast slide"),
  addon(18, "H", "opener_question", "Single-question opener"),
  addon(19, "H", "parking_lot", "Parking-lot extractor"),
  addon(20, "H", "agenda_timebox", "Agenda timebox"),
  addon(21, "H", "red_team", "Red-team outline"),
  addon(22, "H", "board_ops_fork", "Board vs ops fork"),
  addon(23, "H", "continuity_check", "Narrative continuity check"),
  addon(24, "H", "title_ab", "Title A/B pack"),
  // I — Viz (25–36)
  addon(25, "I", "sparkline_history", "Sparkline from history"),
  addon(26, "I", "table_insights", "Table→insight bullets"),
  addon(27, "I", "units_locale", "Units & locale normalizer"),
  addon(28, "I", "icon_suggest", "Iconography suggester"),
  addon(29, "I", "whitespace_coach", "Whitespace coach"),
  addon(30, "I", "callout_hierarchy", "Callout hierarchy"),
  addon(31, "I", "risk_heat", "Risk heat matrix"),
  addon(32, "I", "dependency_graph", "Dependency graph slide"),
  addon(33, "I", "comparison_frame", "Comparison frame"),
  addon(34, "I", "footnote_strip", "Footnote strip"),
  addon(35, "I", "alt_grader", "Alt-text quality grader"),
  addon(36, "I", "so_what_footer", "Slide so-what footer"),
  // J — Editor (37–48)
  addon(37, "J", "selection_rewrite", "Selection-aware rewrite"),
  addon(38, "J", "voice_match", "Voice match from past deck"),
  addon(39, "J", "jargon_translate", "Jargon translator"),
  addon(40, "J", "active_voice", "Passive→active voice"),
  addon(41, "J", "number_highlight", "Number hallucination highlighter"),
  addon(42, "J", "commit_message", "Commit message for edits"),
  addon(43, "J", "conflict_merge", "Conflict merge for co-edit"),
  addon(44, "J", "layout_paste_fix", "Layout auto-fix on paste"),
  addon(45, "J", "comment_apply", "Comment → apply"),
  addon(46, "J", "slide_twin", "Slide twin finder"),
  addon(47, "J", "a11y_autofix", "Accessibility autofix pack"),
  addon(48, "J", "kill_darlings", "Kill-your-darlings mode"),
  // K — Present (49–60)
  addon(49, "K", "teleprompter", "Speaker teleprompter"),
  addon(50, "K", "slow_down_cue", "Live slow-down cue"),
  addon(51, "K", "room_captions", "Room-mode captions"),
  addon(52, "K", "crm_note", "Post-meeting CRM note"),
  addon(53, "K", "assignee_guess", "Action-item assignee guess"),
  addon(54, "K", "share_gate", "Share-link audience gate"),
  addon(55, "K", "view_analytics", "View analytics narrative"),
  addon(56, "K", "async_video", "Async video script"),
  addon(57, "K", "qa_parking_export", "Q&A parking lot export"),
  addon(58, "K", "decision_log", "Decision log PDF"),
  addon(59, "K", "reminder_drip", "Reminder drip"),
  addon(60, "K", "replay_chapters", "Replay with chapters"),
  // L — Org (61–72)
  addon(61, "L", "dependency_radar", "Cross-project dependency radar"),
  addon(62, "L", "theme_cluster", "Theme clustering"),
  addon(63, "L", "exec_digest", "Exec digest email"),
  addon(64, "L", "scorecard", "Scorecard generator"),
  addon(65, "L", "churn_risk", "Churn / cancel risk signals"),
  addon(66, "L", "benchmark_anon", "Benchmark anonymizer"),
  addon(67, "L", "playbook_recommend", "Playbook recommender"),
  addon(68, "L", "skill_gap", "Skill/gap from blockers"),
  addon(69, "L", "budget_narrative", "Budget narrative"),
  addon(70, "L", "compliance_pack", "Compliance pack"),
  addon(71, "L", "template_learn", "Template learning"),
  addon(72, "L", "stakeholder_prefs", "Stakeholder preference memory"),
  // M — Trust (73–84)
  addon(73, "M", "groundedness", "Groundedness score per slide"),
  addon(74, "M", "prompt_pin", "Prompt/version pin"),
  addon(75, "M", "diff_explain", "Diff explainability"),
  addon(76, "M", "pii_scrub", "PII scrubber"),
  addon(77, "M", "secret_scan", "Secret leak scanner"),
  addon(78, "M", "model_router", "Model router"),
  addon(79, "M", "eval_harness", "Eval harness"),
  addon(80, "M", "feedback_loop", "User feedback loop"),
  addon(81, "M", "watermark_meta", "Watermark metadata"),
  addon(82, "M", "role_allowlist", "Role-based AI allowlist"),
  addon(83, "M", "retention_policy", "Retention policy AI"),
  addon(84, "M", "incident_rollback", "Incident rollback"),
  // N — Integrations (85–94)
  addon(85, "N", "slack_status", "Slack bot /status"),
  addon(86, "N", "teams_card", "Teams Adaptive Card"),
  addon(87, "N", "ticket_autolink", "Linear/Jira auto-link"),
  addon(88, "N", "github_releases", "GitHub release notes → progress"),
  addon(89, "N", "meet_summary", "Zoom/Meet bot summary"),
  addon(90, "N", "webhook_intake", "Zapier/Make webhook intake"),
  addon(91, "N", "chrome_clip", "Chrome extension clip"),
  addon(92, "N", "mobile_voice", "Mobile voice capture"),
  addon(93, "N", "friday_agent", "Prepare Friday deck agent"),
  addon(94, "N", "approval_agent", "Approval workflow agent"),
  // O — Delight (95–100)
  addon(95, "O", "moodboard_theme", "Brand moodboard → theme tokens"),
  addon(96, "O", "humor_dial", "Meme-free humor dial"),
  addon(97, "O", "eli5_mode", "Explain like I'm new"),
  addon(98, "O", "competitive_teardown", "Competitive teardown"),
  addon(99, "O", "win_reel", "Anniversary / win reel"),
  addon(100, "O", "pair_presenter", "AI pair presenter"),
];

export const AI_ADDON_FEATURE_IDS = AI_ADDON_CATALOG.map((a) => a.id) as [
  string,
  ...string[],
];

export type AiAddonFeatureId = (typeof AI_ADDON_FEATURE_IDS)[number];

export const TOP_12_ADDON_IDS: AiAddonFeatureId[] = [
  "addon_j_41_number_highlight",
  "addon_m_73_groundedness",
  "addon_i_26_table_insights",
  "addon_i_33_comparison_frame",
  "addon_j_37_selection_rewrite",
  "addon_k_55_view_analytics",
  "addon_l_63_exec_digest",
  "addon_m_75_diff_explain",
  "addon_m_76_pii_scrub",
  "addon_m_78_model_router",
  "addon_n_93_friday_agent",
  "addon_j_46_slide_twin",
];

export function addonById(id: string): AiAddonMeta | undefined {
  return AI_ADDON_CATALOG.find((a) => a.id === id);
}

export function addonsByCluster(cluster: AiAddonCluster): AiAddonMeta[] {
  return AI_ADDON_CATALOG.filter((a) => a.cluster === cluster);
}
