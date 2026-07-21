import Link from "next/link";
import { notFound } from "next/navigation";
import { ExportPanel } from "@/components/decks/export-panel";
import { deckPageTitle } from "@/lib/page-title";
import { requireDeckAccess } from "@/lib/permissions";
import { redirectViewerFromDeckEdit } from "@/lib/viewer-guard";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return deckPageTitle(id, "Export");
}

export default async function DeckExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await redirectViewerFromDeckEdit(id);

  let deck;
  try {
    const result = await requireDeckAccess(id);
    deck = result.deck;
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const { data: exports } = await supabase
    .from("exports")
    .select("id, status, created_at")
    .eq("deck_id", id)
    .order("created_at", { ascending: false })
    .limit(1);

  const latestExport = exports?.[0] ?? null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href={`/decks/${id}/editor`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Editor
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Export deck</h1>
        <p className="text-muted-foreground">{deck.name}</p>
      </div>
      <ExportPanel
        deckId={id}
        deckName={deck.name}
        applyBranding={deck.apply_branding ?? true}
        latestExport={latestExport}
      />
    </div>
  );
}
