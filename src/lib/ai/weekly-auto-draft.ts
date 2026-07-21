import { createAdminClient } from "@/lib/supabase/admin";
import { runGenerateOutline } from "@/lib/ai/generate-outline";

/** Weekly cron: refresh outlines for decks with autoRefreshWeekly metadata. */
export async function runWeeklyAutoDraft() {
  const supabase = createAdminClient();

  const { data: decks, error } = await supabase
    .from("decks")
    .select("id, created_by, metadata, status")
    .in("status", ["draft", "outline", "ready"]);

  if (error) throw new Error(error.message);

  const targets =
    decks?.filter((deck) => {
      const meta = (deck.metadata as { autoRefreshWeekly?: boolean }) ?? {};
      return meta.autoRefreshWeekly === true;
    }) ?? [];

  const results: Array<{ deckId: string; ok: boolean; error?: string }> = [];

  for (const deck of targets) {
    try {
      await runGenerateOutline(deck.id, deck.created_by);
      results.push({ deckId: deck.id, ok: true });
    } catch (err) {
      results.push({
        deckId: deck.id,
        ok: false,
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }

  return { processed: results.length, results };
}
