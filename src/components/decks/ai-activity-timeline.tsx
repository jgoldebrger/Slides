"use client";

import { useEffect, useState } from "react";
import { getDeckAiActivity } from "@/lib/actions/ai-platform";
import type { AiActivityEntry } from "@/lib/ai/activity";
import {
  EntityListMeta,
  EntityListPanel,
  EntityListPrimary,
  EntityListRow,
  EntityListTrailing,
  formatListDate,
} from "@/components/shared/entity-list";

type AiActivityTimelineProps = {
  deckId?: string;
  entries?: AiActivityEntry[];
  className?: string;
};

export function AiActivityTimeline({
  deckId,
  entries: initialEntries,
  className,
}: AiActivityTimelineProps) {
  const [entries, setEntries] = useState<AiActivityEntry[]>(
    initialEntries ?? []
  );
  const [loading, setLoading] = useState(!initialEntries && Boolean(deckId));

  useEffect(() => {
    if (initialEntries) {
      setEntries(initialEntries);
      setLoading(false);
      return;
    }
    if (!deckId) return;
    void (async () => {
      setLoading(true);
      const result = await getDeckAiActivity(deckId);
      setEntries(result.entries);
      setLoading(false);
    })();
  }, [deckId, initialEntries]);

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
    <EntityListPanel className={className}>
      {entries.map((entry) => (
        <EntityListRow key={entry.id}>
          <EntityListPrimary
            title={entry.summary ?? entry.action}
            subtitle={entry.feature_id ?? undefined}
          />
          <EntityListTrailing>
            <EntityListMeta className="inline">
              {formatListDate(entry.created_at)}
            </EntityListMeta>
          </EntityListTrailing>
        </EntityListRow>
      ))}
    </EntityListPanel>
  );
}
