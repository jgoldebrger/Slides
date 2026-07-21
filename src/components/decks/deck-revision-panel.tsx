"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  listDeckRevisions,
  restoreDeckRevision,
} from "@/lib/actions/revisions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type RevisionRow = {
  id: string;
  revision: number;
  reason: string;
  created_at: string;
};

type DeckRevisionPanelProps = {
  deckId: string;
  initialRevisions?: RevisionRow[];
};

const REASON_LABELS: Record<string, string> = {
  refresh: "Before refresh",
  regenerate: "Before regenerate",
  manual: "Before restore",
};

export function DeckRevisionPanel({
  deckId,
  initialRevisions = [],
}: DeckRevisionPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [revisions, setRevisions] = useState<RevisionRow[]>(initialRevisions);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function refreshRevisions() {
    const result = await listDeckRevisions(deckId);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
      return;
    }
    setRevisions("revisions" in result ? (result.revisions ?? []) : []);
  }

  async function handleRestoreConfirm() {
    if (!restoreId) return;
    setRestoringId(restoreId);
    const result = await restoreDeckRevision(deckId, restoreId);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
    } else {
      toast.success("Deck restored from version history");
      setRestoreId(null);
      await refreshRevisions();
      router.refresh();
    }
    setRestoringId(null);
  }

  const pending = revisions.find((r) => r.id === restoreId);

  return (
    <div className="rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="deck-revision-panel"
        id="deck-revision-toggle"
      >
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <History className="h-4 w-4" aria-hidden />
          Version history
        </span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id="deck-revision-panel"
          role="region"
          aria-labelledby="deck-revision-toggle"
          className="space-y-3 border-t border-border px-4 pb-4 pt-3"
        >
          <p className="text-xs text-muted-foreground">
            Snapshots are saved before refresh or regenerate. Restore replaces
            current slides.
          </p>

          {revisions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No versions yet. Refresh or regenerate slides to create the first
              snapshot.
            </p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {revisions.map((revision) => (
                <li
                  key={revision.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      v{revision.revision} ·{" "}
                      {REASON_LABELS[revision.reason] ?? revision.reason}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(revision.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={restoringId !== null}
                    onClick={() => setRestoreId(revision.id)}
                  >
                    <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Dialog
        open={restoreId !== null}
        onOpenChange={(next) => {
          if (!next) setRestoreId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this version?</DialogTitle>
            <DialogDescription>
              Current slides will be replaced with{" "}
              {pending
                ? `v${pending.revision} (${REASON_LABELS[pending.reason] ?? pending.reason})`
                : "the selected snapshot"}
              . A new snapshot of the current deck is saved first so you can undo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreId(null)}
              disabled={restoringId !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleRestoreConfirm()}
              disabled={restoringId !== null}
            >
              {restoringId ? "Restoring…" : "Restore version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
