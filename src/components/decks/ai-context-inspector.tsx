"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { getDeckContextInspector } from "@/lib/actions/ai-workspace";
import { Button } from "@/components/ui/button";
import type { ContextSnapshot } from "@/lib/ai/workspace/types";

type AiContextInspectorProps = {
  deckId: string;
};

export function AiContextInspector({ deckId }: AiContextInspectorProps) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<ContextSnapshot | null>(null);
  const [freshnessDays, setFreshnessDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const result = await getDeckContextInspector(deckId);
    setSnapshot(result.snapshot);
    setFreshnessDays(result.freshnessDays);
    setLoading(false);
  }

  useEffect(() => {
    if (open && !snapshot) void load();
  }, [open, snapshot, deckId]);

  return (
    <div className="rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5">
          <Eye className="h-4 w-4" />
          Context inspector
        </span>
        {freshnessDays !== null && freshnessDays > 7 && (
          <span className="text-xs text-warning">Stale ({freshnessDays}d)</span>
        )}
      </button>

      {open && (
        <div className="space-y-2 border-t border-border px-4 pb-4 pt-3 text-xs">
          {loading && <p className="text-muted-foreground">Loading…</p>}
          {snapshot && (
            <>
              <p>
                <span className="font-medium">Project:</span>{" "}
                {snapshot.projectName ?? "—"}
              </p>
              <p>
                <span className="font-medium">Slides:</span>{" "}
                {snapshot.slideCount ?? 0}
              </p>
              <p>
                <span className="font-medium">Sections:</span>{" "}
                {snapshot.includedSections?.join(", ") || "All"}
              </p>
              <p>
                <span className="font-medium">Update fields:</span>{" "}
                {snapshot.updateFields?.join(", ") || "None"}
              </p>
              {snapshot.deckBrief && (
                <p className="text-muted-foreground">{snapshot.deckBrief}</p>
              )}
              {snapshot.promptExcerpt && (
                <p>
                  <span className="font-medium">Pinned:</span>{" "}
                  {snapshot.promptExcerpt}
                </p>
              )}
            </>
          )}
          <Button size="sm" variant="outline" onClick={() => void load()}>
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}
