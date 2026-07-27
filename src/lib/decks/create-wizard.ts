import { DECK_TYPES, type DeckType } from "@/types/slide";

export const DECK_TYPE_LABELS: Record<DeckType, string> = {
  project_status: "Project status update",
  executive_update: "Executive update",
  weekly_report: "Weekly report",
  rollout_plan: "Rollout plan",
  project_kickoff: "Project kickoff",
  client_presentation: "Client presentation",
};

export const WIZARD_STEPS = [
  { id: 1, label: "Project" },
  { id: 2, label: "Update" },
  { id: 3, label: "Deck" },
  { id: 4, label: "Build" },
] as const;

export type WizardStep = (typeof WIZARD_STEPS)[number]["id"];

export function defaultDeckName(projectName: string): string {
  const month = new Date().toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  return `${projectName} — ${month}`;
}

export function parseQuickUpdate(text: string): {
  progress: string;
  completed_work: string[];
  next_steps: string[];
} {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const completed: string[] = [];
  const next: string[] = [];
  const narrative: string[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("done:") || lower.startsWith("completed:")) {
      completed.push(line.replace(/^[^:]+:\s*/i, ""));
    } else if (lower.startsWith("next:") || lower.startsWith("todo:")) {
      next.push(line.replace(/^[^:]+:\s*/i, ""));
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      narrative.push(line.replace(/^[-•]\s*/, ""));
    } else {
      narrative.push(line);
    }
  }

  return {
    progress: narrative.join("\n"),
    completed_work: completed,
    next_steps: next,
  };
}

export { DECK_TYPES };
