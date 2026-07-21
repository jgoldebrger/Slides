import type { Metadata } from "next";
import Link from "next/link";
import { listDecks } from "@/lib/actions/decks";
import { DeckList } from "@/components/decks/deck-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/state";
import { PageHeader } from "@/components/shared/page-header";
import { getOrgContext } from "@/lib/viewer-guard";

export const metadata: Metadata = { title: "Decks" };

export default async function DecksPage() {
  const [{ isViewer }, decks] = await Promise.all([
    getOrgContext(),
    listDecks(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isViewer ? "Presentations" : "Decks"}
        description={
          isViewer
            ? "Watch presentations shared with your team."
            : "Presentation decks across your projects."
        }
        action={
          !isViewer ? (
            <Button asChild>
              <Link href="/decks/new">New deck</Link>
            </Button>
          ) : undefined
        }
      />

      {!decks.length ? (
        <EmptyState
          title={isViewer ? "No presentations yet" : "No decks yet"}
          description={
            isViewer
              ? "When your team shares decks, they will appear here."
              : "Create a deck from a project to generate AI-powered slide outlines."
          }
          action={
            !isViewer ? (
              <Button asChild>
                <Link href="/decks/new">Create deck</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DeckList
          isViewer={isViewer}
          decks={decks.map((deck) => {
            const raw = deck.projects as { name: string } | { name: string }[] | null;
            const project = Array.isArray(raw) ? raw[0] : raw;
            return {
              id: deck.id,
              name: deck.name,
              type: deck.type,
              status: deck.status,
              projectName: project?.name,
            };
          })}
        />
      )}
    </div>
  );
}
