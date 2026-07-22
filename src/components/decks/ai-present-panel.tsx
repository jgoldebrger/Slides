"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  runFollowUpEmailDraft,
  runHighlightReel,
  runLiveQa,
  runPaceScore,
  runPresenterCopilot,
} from "@/lib/actions/ai-features";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AiPresentPanelProps = {
  deckId: string;
  slideIndex: number;
  remainingMinutes?: number;
};

export function AiPresentPanel({
  deckId,
  slideIndex,
  remainingMinutes = 10,
}: AiPresentPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [output, setOutput] = useState<string | null>(null);

  async function run(action: string, fn: () => Promise<unknown>) {
    setLoading(action);
    const result = await fn();
    const err = getActionError(result as { error?: string });
    if (err) toast.error(err);
    else {
      toast.success(`${action} ready`);
      setOutput(JSON.stringify(result, null, 2));
    }
    setLoading(null);
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="font-medium">AI presentation tools</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Pace, copilot, follow-up email, highlight reel, and live Q&A.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
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
          onClick={() =>
            void run("Presenter copilot", () =>
              runPresenterCopilot(deckId, slideIndex, remainingMinutes)
            )
          }
        >
          Copilot hints
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="live-qa">Live Q&A (cited)</Label>
        <Input
          id="live-qa"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What changed on metrics this week?"
        />
        <Button
          size="sm"
          variant="outline"
          disabled={loading !== null || !question.trim()}
          onClick={() => void run("Live Q&A", () => runLiveQa(deckId, question))}
        >
          Ask deck
        </Button>
      </div>

      {output && (
        <pre className="max-h-48 overflow-auto rounded-md bg-muted/50 p-3 text-xs">
          {output}
        </pre>
      )}
    </div>
  );
}
