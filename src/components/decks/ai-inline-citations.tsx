"use client";

import { useEffect, useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  generateSlideCitations,
  getSlideCitations,
} from "@/lib/actions/ai-workspace";
import { AiCitationList, AiConfidenceBadge } from "@/components/decks/ai-trust-badges";
import { Button } from "@/components/ui/button";
import type { ConfidenceLevel } from "@/lib/ai/confidence";

type AiInlineCitationsProps = {
  deckId: string;
  slideId: string;
};

export function AiInlineCitations({ deckId, slideId }: AiInlineCitationsProps) {
  const [citations, setCitations] = useState<
    Array<{ field: string; excerpt: string }>
  >([]);
  const [confidence, setConfidence] = useState<ConfidenceLevel | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void getSlideCitations(deckId, slideId).then((r) =>
      setCitations(r.citations)
    );
  }, [deckId, slideId]);

  async function handleGenerate() {
    setLoading(true);
    const result = await generateSlideCitations(deckId, slideId);
    const err = getActionError(result);
    if (err) toast.error(err);
    else if ("citations" in result) {
      setCitations(result.citations);
      setConfidence(result.confidence.level);
      toast.success("Citations generated");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Link2 className="h-4 w-4" />
          Citations
        </span>
        {confidence && <AiConfidenceBadge level={confidence} />}
      </div>
      <AiCitationList citations={citations} />
      {!citations.length && (
        <p className="text-xs text-muted-foreground">
          No citations yet. Generate to ground claims in project updates.
        </p>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => void handleGenerate()}
      >
        {loading ? (
          <>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Generating…
          </>
        ) : (
          "Generate citations"
        )}
      </Button>
    </div>
  );
}
