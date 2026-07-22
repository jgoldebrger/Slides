import Link from "next/link";
import { notFound } from "next/navigation";
import { DeckStatusBadge } from "@/components/decks/deck-status-badge";
import { OutlineEditor } from "@/components/decks/outline-editor";
import { deckPageTitle } from "@/lib/page-title";
import { requireDeckAccess } from "@/lib/permissions";
import { redirectViewerFromDeckEdit } from "@/lib/viewer-guard";
import { audienceFromDeckMetadata } from "@/lib/ai/load-deck-audience";
import {
  describeProjectUpdatesCoverage,
  defaultIncludedSectionsForProject,
  getProjectUpdatesCoverage,
  isProjectUpdatesSparse,
  sectionsWithData,
} from "@/lib/ai/project-updates-context";
import { parseDeckMetadata } from "@/lib/validations/deck-metadata";
import { createClient } from "@/lib/supabase/server";
import type { DeckOutline, DeckType } from "@/types/slide";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return deckPageTitle(id, "Outline");
}

export default async function DeckOutlinePage({
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

  const outline = deck.outline as DeckOutline | null;
  const audience = audienceFromDeckMetadata(deck.metadata);
  const deckType = deck.type as DeckType;
  const metadata = parseDeckMetadata(deck.metadata);

  const supabase = await createClient();
  const { data: updates } = await supabase
    .from("project_updates")
    .select("*")
    .eq("project_id", deck.project_id)
    .maybeSingle();

  const updatesSparse = isProjectUpdatesSparse(updates);
  const sectionCoverage = getProjectUpdatesCoverage(updates);
  const updatesCoverage = describeProjectUpdatesCoverage(sectionCoverage);
  const initialIncludedSections =
    (metadata.includedSections as import("@/lib/ai/update-sections").ProjectUpdateSectionId[] | undefined) ??
    defaultIncludedSectionsForProject(updates);
  const filledSections = sectionsWithData(updates);
  const updatesEmpty = filledSections.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/decks"
          className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          ← Decks
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">{deck.name}</h1>
          <DeckStatusBadge status={deck.status} />
        </div>
        <p className="text-muted-foreground">
          Generate and edit the slide outline before creating slides.
        </p>
      </div>
      <OutlineEditor
        deckId={id}
        deckName={deck.name}
        initialOutline={outline}
        deckStatus={deck.status}
        initialAudience={audience}
        deckType={deckType}
        initialIncludedSections={initialIncludedSections}
        initialDeckBrief={metadata.deckBrief ?? ""}
        sectionCoverage={sectionCoverage}
        sectionsWithData={filledSections}
        projectId={deck.project_id}
        updatesEmpty={updatesEmpty}
        updatesSparse={updatesSparse}
        updatesCoverage={updatesCoverage}
      />
    </div>
  );
}
