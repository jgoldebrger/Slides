const ID_PREFIX: Record<string, string> = {
  goals: "goal",
  completed_work: "completed",
  current_tasks: "task",
  milestones: "milestone",
  metrics: "metric",
  risks: "risk",
  blockers: "blocker",
  next_steps: "next_step",
  progress: "progress",
};

const SECTION_ORDER = [
  "goals",
  "completed_work",
  "current_tasks",
  "milestones",
  "metrics",
  "risks",
  "blockers",
  "next_steps",
  "progress",
] as const;

export type UpdateFact = {
  id: string;
  section: string;
  label: string;
  payload: unknown;
};

function labelForItem(section: string, item: unknown, index: number): string {
  if (typeof item === "string") return item.slice(0, 120);
  if (item && typeof item === "object") {
    const record = item as { title?: string; label?: string };
    return String(record.title ?? record.label ?? `${section} ${index + 1}`).slice(
      0,
      120
    );
  }
  return `${section} ${index + 1}`;
}

export function extractUpdateFacts(
  updates: Record<string, unknown>
): UpdateFact[] {
  const facts: UpdateFact[] = [];

  for (const section of SECTION_ORDER) {
    const prefix = ID_PREFIX[section];
    const value = updates[section];

    if (section === "progress") {
      if (typeof value === "string" && value.trim()) {
        facts.push({
          id: "progress:0",
          section,
          label: value.trim().slice(0, 120),
          payload: value,
        });
      }
      continue;
    }

    if (!Array.isArray(value)) continue;

    value.forEach((item, index) => {
      const label = labelForItem(section, item, index);
      if (!label.trim()) return;
      facts.push({
        id: `${prefix}:${index}`,
        section,
        label,
        payload: item,
      });
    });
  }

  return facts;
}

export function factsByIds(facts: UpdateFact[], ids: string[]): UpdateFact[] {
  const idSet = new Set(ids);
  return facts.filter((fact) => idSet.has(fact.id));
}

export function factsToPromptBlock(facts: UpdateFact[]): string {
  return facts.map((fact) => `- [${fact.id}] ${fact.label}`).join("\n");
}
