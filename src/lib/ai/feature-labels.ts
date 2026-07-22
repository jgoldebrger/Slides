import { AI_FEATURE_IDS, type AiFeatureId } from "@/lib/ai/feature-flags";

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
