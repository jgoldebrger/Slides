"use client";

import { useState } from "react";
import { ChevronDown, GitCompare } from "lucide-react";
import type { RefreshDiff } from "@/lib/slides/refresh-diff";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type RefreshDiffPanelProps = {
  diff: RefreshDiff | null;
  onSelectSlide?: (slideId: string) => void;
  onDismiss?: () => void;
};

const REASON_LABELS: Record<string, string> = {
  refresh: "Refresh",
  regenerate: "Regenerate",
  audience_variant: "Audience variant",
  translate: "Translation",
};

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  content: "Content",
  speaker_notes: "Speaker notes",
};

function truncate(text: string, max = 120) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export function RefreshDiffPanel({
  diff,
  onSelectSlide,
  onDismiss,
}: RefreshDiffPanelProps) {
  const [open, setOpen] = useState(true);

  if (!diff || diff.changedCount === 0) return null;

  const changedSlides = diff.slides.filter((s) => s.changed);

  return (
    <div
      role="status"
      className="rounded-lg border border-amber-500/40 bg-amber-500/10"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <GitCompare className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <span className="text-sm font-medium">
            {REASON_LABELS[diff.reason ?? "refresh"] ?? "Update"} changed {diff.changedCount} slide
            {diff.changedCount === 1 ? "" : "s"}
          </span>
          <ChevronDown
            className={cn(
              "ml-auto h-4 w-4 transition-transform",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </button>
        {onDismiss && (
          <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>

      {open && (
        <ul className="max-h-64 space-y-2 overflow-y-auto border-t border-amber-500/20 px-4 py-3">
          {changedSlides.map((slide) => (
            <li
              key={slide.slideId || slide.order}
              className="rounded-md border border-border bg-background p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  Slide {slide.order + 1}: {slide.title}
                </p>
                {slide.slideId && onSelectSlide && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={() => onSelectSlide(slide.slideId)}
                  >
                    View
                  </Button>
                )}
              </div>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {slide.changes.map((change, i) => (
                  <li key={i}>
                    <span className="font-medium text-foreground">
                      {FIELD_LABELS[change.field] ?? change.field}:
                    </span>{" "}
                    {change.field === "content" ? (
                      <span>updated</span>
                    ) : (
                      <>
                        <span className="line-through">{truncate(change.before, 60)}</span>
                        {" → "}
                        <span>{truncate(change.after, 60)}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
