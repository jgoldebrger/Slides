"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  runBriefWizard,
  runConstraintsRegen,
  runOutlineVariants,
  runSlideBudget,
  runStoryArc,
} from "@/lib/actions/ai-features";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AiOutlineToolsProps = {
  deckId: string;
  onOutlineReplace?: (outline: unknown) => void;
};

export function AiOutlineTools({ deckId, onOutlineReplace }: AiOutlineToolsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [audience, setAudience] = useState("");
  const [outcome, setOutcome] = useState("");
  const [slideCount, setSlideCount] = useState(8);
  const [constraints, setConstraints] = useState("");
  const [budget, setBudget] = useState(6);

  async function run(action: string, fn: () => Promise<unknown>) {
    setLoading(action);
    const result = await fn();
    const err = getActionError(result as { error?: string });
    if (err) toast.error(err);
    else {
      toast.success(`${action} complete`);
      if (
        onOutlineReplace &&
        result &&
        typeof result === "object" &&
        "outline" in result &&
        result.outline
      ) {
        onOutlineReplace(result.outline);
      }
    }
    setLoading(null);
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="font-medium">AI outline tools</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Brief wizard, variants, slide budget, story arc, and constraint regen.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="brief-audience">Audience</Label>
          <Input
            id="brief-audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Exec sponsors"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="brief-outcome">Outcome</Label>
          <Input
            id="brief-outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="Approve next phase"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="brief-slides">Slides</Label>
          <Input
            id="brief-slides"
            type="number"
            min={2}
            max={30}
            value={slideCount}
            onChange={(e) => setSlideCount(Number(e.target.value))}
          />
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={loading !== null || !audience.trim() || !outcome.trim()}
        onClick={() =>
          void run("Brief wizard", () =>
            runBriefWizard(audience, outcome, slideCount)
          )
        }
      >
        Build brief
      </Button>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null}
          onClick={() => void run("Outline variants", () => runOutlineVariants(deckId))}
        >
          Variants
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null}
          onClick={() => void run("Story arc", () => runStoryArc(deckId))}
        >
          Story arc
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="slide-budget">Target slides</Label>
          <Input
            id="slide-budget"
            type="number"
            min={2}
            max={30}
            className="w-24"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null}
          onClick={() =>
            void run("Slide budget", async () => {
              const r = await runSlideBudget(deckId, budget);
              if ("outline" in r && r.outline) onOutlineReplace?.(r.outline);
              return r;
            })
          }
        >
          Compress to budget
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="constraints">Regenerate with constraints</Label>
        <textarea
          id="constraints"
          rows={2}
          value={constraints}
          onChange={(e) => setConstraints(e.target.value)}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="e.g. Lead with risks, max 6 slides, no jargon"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null || !constraints.trim()}
          onClick={() =>
            void run("Constraints regen", async () => {
              const r = await runConstraintsRegen(deckId, constraints);
              if ("outline" in r && r.outline) onOutlineReplace?.(r.outline);
              return r;
            })
          }
        >
          Regenerate outline
        </Button>
      </div>
    </div>
  );
}
