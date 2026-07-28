"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deckPrimaryHref, deckTypeLabel } from "@/lib/deck-labels";
import { deleteDeck } from "@/lib/actions/decks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeckStatusBadge } from "@/components/decks/deck-status-badge";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import {
  EntityListMeta,
  EntityListPrimary,
  EntityListRow,
  EntityListTrailing,
  entityListMenuButtonClass,
  formatListDate,
} from "@/components/shared/entity-list";

type DeckListRowProps = {
  deck: {
    id: string;
    name: string;
    type: string;
    status: string;
    projectName?: string;
    updated_at?: string;
  };
  isViewer: boolean;
};

export function DeckListRow({ deck, isViewer }: DeckListRowProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const primaryHref = deckPrimaryHref(deck.id, deck.status, isViewer);
  const subtitle = `${deck.projectName ?? "Unknown project"} · ${deckTypeLabel(deck.type)}`;

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteDeck(deck.id);
    if ("error" in result && result.error) {
      toast.error(result.error);
      setDeleting(false);
      return;
    }
    toast.success("Deck deleted");
    setConfirmOpen(false);
    router.refresh();
    setDeleting(false);
  }

  return (
    <>
      <EntityListRow>
        <EntityListPrimary
          href={primaryHref}
          title={deck.name}
          subtitle={subtitle}
        />
        <EntityListTrailing>
          {!isViewer && <DeckStatusBadge status={deck.status} />}
          {isViewer ? (
            <EntityListMeta>Watch</EntityListMeta>
          ) : deck.updated_at ? (
            <EntityListMeta>{formatListDate(deck.updated_at)}</EntityListMeta>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={entityListMenuButtonClass}
                aria-label={`Actions for ${deck.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isViewer ? (
                <DropdownMenuItem asChild>
                  <Link href={`/decks/${deck.id}/player`}>Watch</Link>
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/decks/${deck.id}/outline`}>Outline</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/decks/${deck.id}/editor`}>Editor</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/decks/${deck.id}/player`}>Play</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/decks/${deck.id}/export`}>Export</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => setConfirmOpen(true)}
                  >
                    Delete deck
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </EntityListTrailing>
      </EntityListRow>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete deck?</DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>{deck.name}</strong> and all slides.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete deck"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
