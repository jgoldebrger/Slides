"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { rollbackLastAiChange, runScopedRegenerate } from "@/lib/actions/ai-workspace";
import { pollAiGeneration } from "@/lib/hooks/poll-ai-generation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RegenerateScope } from "@/lib/ai/workspace/types";

type ScopedRegeneratePanelProps = {
  deckId: string;
  slideId?: string;
  onComplete?: () => void;
};

const SCOPES: { id: RegenerateScope; label: string }[] = [
  { id: "claim", label: "Claim" },
  { id: "bullet", label: "Bullet" },
  { id: "slide", label: "Slide" },
  { id: "section", label: "Section" },
  { id: "deck", label: "Full deck" },
];

export function ScopedRegeneratePanel({
  deckId,
  slideId,
  onComplete,
}: ScopedRegeneratePanelProps) {
  const [scope, setScope] = useState<RegenerateScope>("slide");
  const [instruction, setInstruction] = useState("");
  const [keepEdits, setKeepEdits] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleRegenerate() {
    if (scope !== "deck" && !slideId) {
      toast.error("Select a slide first");
      return;
    }
    setLoading(true);
    const result = await runScopedRegenerate({
      deckId,
      slideId,
      scope,
      instruction: instruction || undefined,
      keepEdits,
    });
    const err = getActionError(result);
    if (err) {
      toast.error(err);
      setLoading(false);
      return;
    }
    if ("generationId" in result && result.generationId) {
      await pollAiGeneration(deckId, result.generationId);
    }
    toast.success("Regenerated");
    onComplete?.();
    setLoading(false);
  }

  async function handleRollback() {
    setLoading(true);
    const result = await rollbackLastAiChange(deckId);
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success("Rolled back last AI change");
      onComplete?.();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <RefreshCw className="h-4 w-4" />
        Scoped regenerate
      </div>

      <div className="flex flex-wrap gap-1">
        {SCOPES.map((s) => (
          <Button
            key={s.id}
            type="button"
            size="sm"
            variant={scope === s.id ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => setScope(s.id)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      <div className="space-y-1">
        <Label htmlFor="regen-instruction" className="text-xs">
          Instruction (optional)
        </Label>
        <Input
          id="regen-instruction"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="shorter, more skeptical…"
          className="h-8 text-xs"
        />
      </div>

      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={keepEdits}
          onChange={(e) => setKeepEdits(e.target.checked)}
        />
        Keep my edits
      </label>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={loading} onClick={() => void handleRegenerate()}>
          {loading ? "Running…" : "Regenerate"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => void handleRollback()}
        >
          Rollback last AI
        </Button>
      </div>
    </div>
  );
}
