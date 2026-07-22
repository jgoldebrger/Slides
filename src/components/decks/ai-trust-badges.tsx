"use client";

import type { ConfidenceLevel } from "@/lib/ai/confidence";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<ConfidenceLevel, string> = {
  high: "bg-success/15 text-success",
  medium: "bg-warning/15 text-warning",
  low: "bg-destructive/15 text-destructive",
};

type AiConfidenceBadgeProps = {
  level: ConfidenceLevel;
  reason?: string;
  className?: string;
};

export function AiConfidenceBadge({
  level,
  reason,
  className,
}: AiConfidenceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium",
        LEVEL_STYLES[level],
        className
      )}
      title={reason}
    >
      {level} confidence
    </span>
  );
}

type AiCitationListProps = {
  citations: Array<{ field: string; excerpt: string }>;
};

export function AiCitationList({ citations }: AiCitationListProps) {
  if (!citations.length) return null;
  return (
    <ul className="space-y-1 text-xs text-muted-foreground">
      {citations.map((c, i) => (
        <li key={`${c.field}-${i}`}>
          <span className="font-medium text-foreground">{c.field}:</span>{" "}
          {c.excerpt}
        </li>
      ))}
    </ul>
  );
}
