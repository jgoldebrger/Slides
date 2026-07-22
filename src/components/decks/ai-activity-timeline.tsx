"use client";

import { useEffect, useState } from "react";
import { getDeckAiActivity } from "@/lib/actions/ai-platform";
import type { AiActivityEntry } from "@/lib/ai/activity";

type AiActivityTimelineProps = {
  deckId: string;
};

export function AiActivityTimeline({ deckId }: AiActivityTimelineProps) {
  const [entries, setEntries] = useState<AiActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const result = await getDeckAiActivity(deckId);
      setEntries(result.entries);
      setLoading(false);
    })();
  }, [deckId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading AI activity…</p>;
  }

  if (!entries.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No AI activity recorded for this deck yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2 text-sm">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="rounded-md border border-border px-3 py-2"
        >
          <div className="font-medium">{entry.summary ?? entry.action}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(entry.created_at).toLocaleString()}
            {entry.feature_id ? ` · ${entry.feature_id}` : ""}
          </div>
        </li>
      ))}
    </ul>
  );
}
