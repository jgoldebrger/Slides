"use client";

import { useState } from "react";
import { Mic, MonitorPlay, Timer } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { getPresentModeScript } from "@/lib/actions/ai-workspace";
import { Button } from "@/components/ui/button";

type PresentModesPanelProps = {
  deckId: string;
  slideIndex: number;
};

export function PresentModesPanel({
  deckId,
  slideIndex,
}: PresentModesPanelProps) {
  const [mode, setMode] = useState<
    "teleprompter" | "pace_coach" | "async_video" | null
  >(null);
  const [script, setScript] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(
    next: "teleprompter" | "pace_coach" | "async_video"
  ) {
    setLoading(true);
    setMode(next);
    const result = await getPresentModeScript(deckId, slideIndex, next);
    const err = getActionError(result);
    if (err) toast.error(err);
    else if ("script" in result) {
      setScript(result.script);
      setHint(
        "paceHint" in result && result.paceHint ? result.paceHint : null
      );
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h3 className="font-medium">Present modes</h3>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={mode === "teleprompter" ? "default" : "outline"}
          disabled={loading}
          onClick={() => void load("teleprompter")}
        >
          <MonitorPlay className="mr-1 h-4 w-4" />
          Teleprompter
        </Button>
        <Button
          size="sm"
          variant={mode === "pace_coach" ? "default" : "outline"}
          disabled={loading}
          onClick={() => void load("pace_coach")}
        >
          <Timer className="mr-1 h-4 w-4" />
          Pace coach
        </Button>
        <Button
          size="sm"
          variant={mode === "async_video" ? "default" : "outline"}
          disabled={loading}
          onClick={() => void load("async_video")}
        >
          <Mic className="mr-1 h-4 w-4" />
          Async video
        </Button>
      </div>
      {script && (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 text-sm">
          {hint && <p className="mb-2 text-xs font-medium text-warning">{hint}</p>}
          <p className="whitespace-pre-wrap">{script}</p>
        </div>
      )}
    </div>
  );
}
