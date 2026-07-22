"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { runIntakeForProject, runGapFillSuggestions } from "@/lib/actions/ai-features";
import { AiResultPanel } from "@/components/ai/ai-result-panel";
import type { DeckType } from "@/types/slide";
import type { ProjectUpdateInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type GapFillResult = {
  missingSections?: string[];
  suggestions?: Array<{ field: string; draft: string }>;
};

type AiIntakePanelProps = {
  projectId: string;
  deckType?: DeckType;
  onParsedUpdates?: (updates: Partial<ProjectUpdateInput>) => void;
  onGapFillApplied?: (updates: Partial<ProjectUpdateInput>) => void;
};

export function AiIntakePanel({
  projectId,
  deckType = "project_status",
  onParsedUpdates,
  onGapFillApplied,
}: AiIntakePanelProps) {
  const [text, setText] = useState("");
  const [source, setSource] = useState<
    "intake_voice" | "intake_ocr" | "intake_slack" | "intake_jira" | "intake_email"
  >("intake_slack");
  const [loading, setLoading] = useState(false);
  const [gapFillResult, setGapFillResult] = useState<GapFillResult | null>(null);

  async function handleParse() {
    setLoading(true);
    const result = await runIntakeForProject(projectId, source, text);
    const err = getActionError(result);
    if (err) toast.error(err);
    else if ("updates" in result && result.updates) {
      onParsedUpdates?.(result.updates as Partial<ProjectUpdateInput>);
      toast.success("Parsed — merged into form");
    }
    setLoading(false);
  }

  async function handleGapFill() {
    setLoading(true);
    const result = await runGapFillSuggestions(projectId, deckType);
    const err = getActionError(result);
    if (err) toast.error(err);
    else if ("result" in result && result.result) {
      setGapFillResult(result.result as GapFillResult);
      toast.success("Gap-fill suggestions ready");
    }
    setLoading(false);
  }

  function applyGapFill() {
    if (!gapFillResult?.suggestions?.length || !onGapFillApplied) return;
    const merged: Partial<ProjectUpdateInput> = {};
    for (const suggestion of gapFillResult.suggestions) {
      const field = suggestion.field as keyof ProjectUpdateInput;
      const value = suggestion.draft.trim();
      if (!value) continue;
      const existing = merged[field];
      if (Array.isArray(existing)) {
        merged[field] = [...existing, value] as never;
      } else if (typeof existing === "string") {
        merged[field] = `${existing}\n${value}` as never;
      } else {
        merged[field] = value as never;
      }
    }
    onGapFillApplied(merged);
    toast.success("Gap-fill drafts merged into form");
    setGapFillResult(null);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="font-medium">AI intake</h3>
      <p className="text-xs text-muted-foreground">
        Paste Slack, email, Jira, OCR, or voice transcript to extract project updates.
      </p>
      <div className="space-y-2">
        <Label htmlFor="intake-source">Source</Label>
        <select
          id="intake-source"
          value={source}
          onChange={(e) => setSource(e.target.value as typeof source)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="intake_slack">Slack / Teams</option>
          <option value="intake_email">Email</option>
          <option value="intake_jira">Jira / Linear</option>
          <option value="intake_ocr">OCR / PDF text</option>
          <option value="intake_voice">Voice transcript</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="intake-text">Content to parse</Label>
        <textarea
          id="intake-text"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="Paste content to parse…"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={loading || !text.trim()}
          onClick={() => void handleParse()}
        >
          Parse into updates
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => void handleGapFill()}
        >
          Suggest gap fills
        </Button>
      </div>
      {gapFillResult ? (
        <div className="space-y-2">
          <AiResultPanel data={gapFillResult} title="Gap-fill suggestions" />
          {onGapFillApplied && gapFillResult.suggestions?.length ? (
            <Button type="button" size="sm" variant="secondary" onClick={applyGapFill}>
              Apply suggestions to form
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
