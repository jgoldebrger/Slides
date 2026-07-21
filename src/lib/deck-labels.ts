import { DECK_TYPES, type DeckType } from "@/types/slide";

export const DECK_TYPE_LABELS: Record<DeckType, string> = {
  project_status: "Project status update",
  executive_update: "Executive update",
  weekly_report: "Weekly report",
  rollout_plan: "Rollout plan",
  project_kickoff: "Project kickoff",
  client_presentation: "Client presentation",
};

export function deckTypeLabel(type: string): string {
  if ((DECK_TYPES as readonly string[]).includes(type)) {
    return DECK_TYPE_LABELS[type as DeckType];
  }
  return type.replace(/_/g, " ");
}

export function deckPrimaryHref(
  deckId: string,
  status: string,
  isViewer: boolean
): string {
  if (isViewer) return `/decks/${deckId}/player`;
  if (status === "ready" || status === "approved") {
    return `/decks/${deckId}/editor`;
  }
  return `/decks/${deckId}/outline`;
}
