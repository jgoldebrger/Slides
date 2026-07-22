import type { ProjectUpdateSectionId } from "@/lib/ai/update-sections";
import { PROJECT_UPDATE_SECTION_IDS } from "@/lib/ai/update-sections";

export type ContentDensity = "empty" | "thin" | "medium" | "rich";

export type ContentAnalysis = {
  contentDigest: string;
  slideCountMin: number;
  slideCountMax: number;
  density: ContentDensity;
  totalItems: number;
};

function countStringList(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter(
    (item) => typeof item === "string" && item.trim().length > 0
  ).length;
}

function countObjectList(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.filter((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as { title?: string; label?: string };
    const text = record.title ?? record.label ?? "";
    return String(text).trim().length > 0;
  }).length;
}

function progressLength(value: unknown): number {
  return typeof value === "string" ? value.trim().length : 0;
}

function buildItemCounts(updates: Record<string, unknown>) {
  return {
    goals: countStringList(updates.goals),
    progress: progressLength(updates.progress) > 0 ? 1 : 0,
    completed_work: countStringList(updates.completed_work),
    current_tasks: countObjectList(updates.current_tasks),
    milestones: countObjectList(updates.milestones),
    metrics: countObjectList(updates.metrics),
    risks: countObjectList(updates.risks),
    blockers: countStringList(updates.blockers),
    next_steps: countStringList(updates.next_steps),
  };
}

function digestPart(label: string, count: number, extra?: string): string | null {
  if (count <= 0) return null;
  return extra ? `${count} ${label} (${extra})` : `${count} ${label}`;
}

export function analyzeProjectUpdates(
  updates: Record<string, unknown>
): ContentAnalysis {
  const counts = buildItemCounts(updates);
  const totalItems = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const filledSections = PROJECT_UPDATE_SECTION_IDS.filter(
    (id) => counts[id as keyof typeof counts] > 0
  );

  const parts: string[] = [];
  const metricsWithTrend = Array.isArray(updates.metrics)
    ? (updates.metrics as Array<{ trend?: string }>).filter((m) => m.trend).length
    : 0;

  const goalsPart = digestPart("goals", counts.goals);
  if (goalsPart) parts.push(goalsPart);
  if (counts.progress) parts.push("narrative progress summary");
  const completedPart = digestPart("completed items", counts.completed_work);
  if (completedPart) parts.push(completedPart);
  const tasksPart = digestPart("active tasks", counts.current_tasks);
  if (tasksPart) parts.push(tasksPart);
  const milestonesPart = digestPart("milestones", counts.milestones);
  if (milestonesPart) parts.push(milestonesPart);
  const metricsPart = digestPart(
    "metrics",
    counts.metrics,
    metricsWithTrend ? `${metricsWithTrend} with trends` : undefined
  );
  if (metricsPart) parts.push(metricsPart);
  const risksPart = digestPart("risks", counts.risks);
  if (risksPart) parts.push(risksPart);
  const blockersPart = digestPart("blockers", counts.blockers);
  if (blockersPart) parts.push(blockersPart);
  const nextPart = digestPart("next steps", counts.next_steps);
  if (nextPart) parts.push(nextPart);

  const layoutHints: string[] = [];
  if (counts.metrics >= 2) layoutHints.push("metrics_grid or chart for KPIs");
  if (counts.milestones >= 2) layoutHints.push("timeline for milestones");
  if (counts.completed_work >= 4 || counts.current_tasks >= 4) {
    layoutHints.push("split dense lists across multiple slides");
  }

  let density: ContentDensity;
  let slideCountMin: number;
  let slideCountMax: number;

  if (totalItems === 0) {
    density = "empty";
    slideCountMin = 0;
    slideCountMax = 0;
  } else if (totalItems <= 4 || filledSections.length <= 2) {
    density = "thin";
    slideCountMin = 3;
    slideCountMax = 5;
  } else if (totalItems <= 12) {
    density = "medium";
    slideCountMin = 5;
    slideCountMax = 9;
  } else {
    density = "rich";
    slideCountMin = 7;
    slideCountMax = 12;
  }

  const contentDigest =
    parts.length > 0
      ? `Content available: ${parts.join("; ")}. Filled sections: ${filledSections.join(", ") || "none"}.${
          layoutHints.length ? ` Layout hints: ${layoutHints.join("; ")}.` : ""
        }`
      : "No substantive project update content available.";

  return {
    contentDigest,
    slideCountMin,
    slideCountMax,
    density,
    totalItems,
  };
}

export function contentAnalysisPromptBlock(
  analysis: ContentAnalysis
): string {
  return `Content analysis:
- ${analysis.contentDigest}
- Recommended slide count: ${analysis.slideCountMin}–${analysis.slideCountMax} slides (density: ${analysis.density}).`;
}
