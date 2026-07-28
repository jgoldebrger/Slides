import type { AiAddonCluster } from "@/lib/ai/addons/catalog";

export const ADDON_CLUSTER_LABELS: Record<AiAddonCluster, string> = {
  G: "Intake",
  H: "Narrative",
  I: "Visualization",
  J: "Editor",
  K: "Present",
  L: "Org",
  M: "Trust",
  N: "Integrations",
  O: "Delight",
};

export const ADDON_CLUSTER_DESCRIPTIONS: Record<AiAddonCluster, string> = {
  G: "Import and transform external sources into structured updates.",
  H: "Advanced narrative and storyline tools for decks.",
  I: "Visualization, layout, and chart enhancement add-ons.",
  J: "Deep editing, review, and collaboration utilities.",
  K: "Presentation delivery, sharing, and follow-up tools.",
  L: "Organization-wide intelligence, rollups, and digests.",
  M: "Trust, safety, compliance, and governance extensions.",
  N: "Third-party integrations and workflow connectors.",
  O: "Polish, tone, and presentation delight enhancements.",
};

const ADDON_CLUSTER_CONTEXT: Record<AiAddonCluster, string> = {
  G: "project intake",
  H: "deck narrative",
  I: "slide visualization",
  J: "slide editing",
  K: "presenting and sharing",
  L: "org-wide reporting",
  M: "AI trust and safety",
  N: "external integrations",
  O: "deck polish and tone",
};

export function getAddonClusterDescription(cluster: AiAddonCluster): string {
  return ADDON_CLUSTER_DESCRIPTIONS[cluster];
}

export function getAddonClusterLabel(cluster: AiAddonCluster): string {
  return ADDON_CLUSTER_LABELS[cluster];
}

export function getAddonDescription(
  label: string,
  cluster: AiAddonCluster
): string {
  return `${label} — extends ${ADDON_CLUSTER_CONTEXT[cluster]}.`;
}

export function groupAddonsByCluster<
  T extends { cluster: AiAddonCluster },
>(addons: T[], clusters: AiAddonCluster[]) {
  return clusters
    .map((cluster) => ({
      id: cluster,
      label: ADDON_CLUSTER_LABELS[cluster],
      addons: addons.filter((addon) => addon.cluster === cluster),
    }))
    .filter((group) => group.addons.length > 0);
}
