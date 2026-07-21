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

type DeckListRowProps = {
  deck: {
    id: string;
    name: string;
    type: string;
    status: string;
    projectName?: string;
  };
  isViewer: boolean;
};

export function DeckListRow({ deck, isViewer }: DeckListRowProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const primaryHref = deckPrimaryHref(deck.id, deck.status, isViewer);

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
      <li className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-muted/60">
        <Link href={primaryHref} className="min-w-0 flex-1">
          <p className="font-medium">{deck.name}</p>
          <p className="text-sm text-muted-foreground">
            {deck.projectName ?? "Unknown project"} ·{" "}
            {deckTypeLabel(deck.type)}
          </p>
        </Link>
        <div className="flex items-center gap-2">
          {!isViewer && <DeckStatusBadge status={deck.status} />}
          {isViewer && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Watch
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Actions for ${deck.name}`}>
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
        </div>
      </li>

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
