"use client";

import { useEffect, useState } from "react";
import { DollarSign } from "lucide-react";
import { getAiCostSummary } from "@/lib/actions/ai-workspace";

export function AiCostMeter() {
  const [summary, setSummary] = useState<{
    totalTokens: number;
    estimatedCostUsd: number;
    generationCount: number;
  } | null>(null);

  useEffect(() => {
    void getAiCostSummary().then((r) => {
      if ("totalTokens" in r) setSummary(r);
    });
  }, []);

  if (!summary) {
    return <p className="text-sm text-muted-foreground">Loading AI usage…</p>;
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-1.5 font-medium">
        <DollarSign className="h-4 w-4" />
        AI usage this month
      </h3>
      <dl className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Tokens</dt>
          <dd className="font-medium">{summary.totalTokens.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Est. cost</dt>
          <dd className="font-medium">${summary.estimatedCostUsd.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Generations</dt>
          <dd className="font-medium">{summary.generationCount}</dd>
        </div>
      </dl>
    </div>
  );
}
