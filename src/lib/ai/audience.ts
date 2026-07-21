export const DECK_AUDIENCES = [
  "general",
  "executive",
  "board",
  "team",
  "client",
] as const;

export type DeckAudience = (typeof DECK_AUDIENCES)[number];

export const DECK_AUDIENCE_LABELS: Record<DeckAudience, string> = {
  general: "General",
  executive: "Executive summary",
  board: "Board",
  team: "Team deep-dive",
  client: "Customer-safe",
};

const AUDIENCE_HINTS: Record<DeckAudience, string> = {
  general:
    "Write for a mixed project audience: clear status, balanced detail, professional but approachable.",
  executive:
    "Write for executives: high-level outcomes, key risks, decisions needed — minimize implementation detail.",
  board:
    "Write for a board audience: strategic framing, financial or KPI impact, governance-level risks, no internal drama.",
  team:
    "Write for the delivery team: more tactical detail, dependencies, blockers, and concrete next steps.",
  client:
    "Write for external customers: no internal-only details, no blame, focus on value delivered and upcoming milestones.",
};

export function isDeckAudience(value: unknown): value is DeckAudience {
  return (
    typeof value === "string" &&
    (DECK_AUDIENCES as readonly string[]).includes(value)
  );
}

export function normalizeDeckAudience(value: unknown): DeckAudience {
  return isDeckAudience(value) ? value : "general";
}

export function audiencePromptHint(audience: DeckAudience = "general"): string {
  return AUDIENCE_HINTS[normalizeDeckAudience(audience)];
}
