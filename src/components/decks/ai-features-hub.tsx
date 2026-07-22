"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  runDuplicateDetection,
  runFollowUpEmailDraft,
  runHighlightReel,
  runOutlineVariants,
  runPaceScore,
  runRehearsalQa,
  runRewriteChip,
  runSlideFactCheck,
} from "@/lib/actions/ai-features";
import { AiActivityTimeline } from "@/components/decks/ai-activity-timeline";
import { AiConfidenceBadge } from "@/components/decks/ai-trust-badges";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type AiFeaturesHubProps = {
  deckId: string;
  slideId?: string;
};

export function AiFeaturesHub({ deckId, slideId }: AiFeaturesHubProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [chipText, setChipText] = useState("");

  async function run(action: string, fn: () => Promise<unknown>) {
    setLoading(action);
    try {
      const result = await fn();
      const err = getActionError(result as { error?: string });
      if (err) toast.error(err);
      else toast.success(`${action} complete`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `${action} failed`);
    }
    setLoading(null);
  }

  return (
    <div className="space-y-6 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="font-medium">AI features</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          New AI capabilities (feature-flagged). Enable via org settings or env.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null}
          onClick={() => void run("Outline variants", () => runOutlineVariants(deckId))}
        >
          Outline variants
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null}
          onClick={() => void run("Pace score", () => runPaceScore(deckId))}
        >
          Pace score
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null}
          onClick={() => void run("Follow-up email", () => runFollowUpEmailDraft(deckId))}
        >
          Follow-up email
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null}
          onClick={() => void run("Highlight reel", () => runHighlightReel(deckId))}
        >
          Highlight reel
        </Button>
        {slideId && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={loading !== null}
              onClick={() =>
                void run("Fact check", () => runSlideFactCheck(deckId, slideId))
              }
            >
              Fact check slide
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={loading !== null}
              onClick={() =>
                void run("Rehearsal Q&A", () => runRehearsalQa(deckId, slideId))
              }
            >
              Rehearsal Q&A
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null}
          onClick={() =>
            void run("Duplicate detection", () => runDuplicateDetection(deckId))
          }
        >
          Find duplicates
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <AiConfidenceBadge level="high" reason="Grounded in project updates when citations are present." />
        <span className="text-xs text-muted-foreground">Trust indicators (Wave 0)</span>
      </div>

      <div className="space-y-2">
        <Label>Rewrite chip</Label>
        <textarea
          rows={2}
          value={chipText}
          onChange={(e) => setChipText(e.target.value)}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {(["shorter", "stronger", "quantify", "soften"] as const).map((chip) => (
            <Button
              key={chip}
              size="sm"
              variant="secondary"
              disabled={!chipText.trim() || loading !== null}
              onClick={() =>
                void run(`Rewrite ${chip}`, async () => {
                  const r = await runRewriteChip(deckId, chipText, chip);
                  if ("text" in r && r.text) setChipText(r.text);
                  return r;
                })
              }
            >
              {chip}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-medium">AI activity</h4>
        <AiActivityTimeline deckId={deckId} />
      </div>
    </div>
  );
}
