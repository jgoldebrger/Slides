import type { SupabaseClient } from "@supabase/supabase-js";

export type OrgDeckStyleHint = {
  deckCount: number;
  commonLayouts: string[];
  sampleTitles: string[];
  hint: string;
};

/** Summarize recent ready decks in the org to steer outline/fill structure. */
export async function loadOrgDeckStyle(
  supabase: SupabaseClient,
  orgId: string,
  excludeDeckId?: string
): Promise<OrgDeckStyleHint | null> {
  let query = supabase
    .from("decks")
    .select("id, name, outline")
    .eq("org_id", orgId)
    .eq("status", "ready")
    .order("updated_at", { ascending: false })
    .limit(5);

  if (excludeDeckId) {
    query = query.neq("id", excludeDeckId);
  }

  const { data: decks } = await query;
  if (!decks?.length) return null;

  const layouts: string[] = [];
  const titles: string[] = [];

  for (const deck of decks) {
    const outline = deck.outline as {
      slides?: Array<{ title?: string; layout?: string }>;
    } | null;
    for (const slide of outline?.slides ?? []) {
      if (slide.layout) layouts.push(slide.layout);
      if (slide.title) titles.push(slide.title);
    }
  }

  if (!layouts.length && !titles.length) return null;

  const layoutCounts = layouts.reduce<Record<string, number>>((acc, l) => {
    acc[l] = (acc[l] ?? 0) + 1;
    return acc;
  }, {});

  const commonLayouts = Object.entries(layoutCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([l]) => l);

  const hint =
    commonLayouts.length > 0
      ? `This organization often uses layouts: ${commonLayouts.join(", ")}. Prefer similar structure when appropriate.`
      : "Match the organization's prior deck pacing and section flow.";

  return {
    deckCount: decks.length,
    commonLayouts,
    sampleTitles: titles.slice(0, 12),
    hint,
  };
}
