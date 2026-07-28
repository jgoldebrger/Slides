"use client";

import { useEffect, useState } from "react";
import { getAiCostSummary } from "@/lib/actions/ai-workspace";

export function AiCostMeter({ embedded = false }: { embedded?: boolean }) {
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
    return <p className="text-sm text-muted-foreground">Loading usage…</p>;
  }

  const content = (
    <dl className="grid grid-cols-3 gap-4 text-sm">
      <div>
        <dt className="text-muted-foreground">Tokens</dt>
        <dd className="text-lg font-semibold text-link">
          {summary.totalTokens.toLocaleString()}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Est. cost</dt>
        <dd className="text-lg font-semibold text-link">
          ${summary.estimatedCostUsd.toFixed(2)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Generations</dt>
        <dd className="text-lg font-semibold text-link">
          {summary.generationCount}
        </dd>
      </div>
    </dl>
  );

  if (embedded) return content;

  return (
    <div className="rounded-lg border border-link/20 bg-[var(--color-brand-100)]/75 p-4">
      <h3 className="mb-3 font-medium">AI usage this month</h3>
      {content}
    </div>
  );
}
