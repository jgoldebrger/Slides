"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { updateDeckContentFocus } from "@/lib/actions/deck-content-focus";
import {
  defaultIncludedSectionsForDeckType,
  PROJECT_UPDATE_SECTION_IDS,
  PROJECT_UPDATE_SECTIONS,
  type ProjectUpdateSectionId,
} from "@/lib/ai/update-sections";
import { deckTypeLabel } from "@/lib/deck-labels";
import type { DeckType } from "@/types/slide";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type DeckContentFocusPanelProps = {
  deckId: string;
  deckType: DeckType;
  initialSections: ProjectUpdateSectionId[];
  initialBrief?: string;
  sectionCoverage?: Record<ProjectUpdateSectionId, boolean>;
  sectionsWithData?: ProjectUpdateSectionId[];
  disabled?: boolean;
};

export function DeckContentFocusPanel({
  deckId,
  deckType,
  initialSections,
  initialBrief = "",
  sectionCoverage,
  sectionsWithData,
  disabled = false,
}: DeckContentFocusPanelProps) {
  const fallbackSections =
    sectionsWithData?.length
      ? sectionsWithData
      : [...PROJECT_UPDATE_SECTION_IDS];

  const [sections, setSections] = useState<ProjectUpdateSectionId[]>(
    initialSections.length ? initialSections : fallbackSections
  );
  const [brief, setBrief] = useState(initialBrief);
  const [saving, setSaving] = useState(false);

  const toggleSection = (id: ProjectUpdateSectionId) => {
    setSections((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) {
          toast.error("Include at least one section");
          return prev;
        }
        return prev.filter((s) => s !== id);
      }
      return [...prev, id];
    });
  };

  const persist = useCallback(
    async (nextSections: ProjectUpdateSectionId[], nextBrief: string) => {
      setSaving(true);
      const result = await updateDeckContentFocus(deckId, {
        includedSections: nextSections,
        deckBrief: nextBrief,
      });
      const actionError = getActionError(result);
      if (actionError) toast.error(actionError);
      else toast.success("Content focus saved");
      setSaving(false);
    },
    [deckId]
  );

  function handleResetToDeckType() {
    const defaults = defaultIncludedSectionsForDeckType(deckType);
    setSections(defaults);
    void persist(defaults, brief);
  }

  function handleSave() {
    void persist(sections, brief);
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="font-medium">Content focus</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose which project update facts AI may use for this deck — not which
          slides to create. Your project still has all tabs; this only scopes
          what the AI can draw from for{" "}
          <span className="font-medium">{deckTypeLabel(deckType)}</span>.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Facts AI may use</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROJECT_UPDATE_SECTIONS.map((section) => {
            const checked = sections.includes(section.id);
            const hasData = sectionCoverage?.[section.id];
            return (
              <label
                key={section.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled || saving}
                  onChange={() => toggleSection(section.id)}
                />
                <span className="flex-1">{section.label}</span>
                {sectionCoverage && (
                  <span
                    className={
                      hasData
                        ? "text-xs text-emerald-600"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {hasData ? "has data" : "empty"}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || saving}
          onClick={handleResetToDeckType}
        >
          Reset section filter to {deckTypeLabel(deckType)} defaults
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deck-brief">Deck brief (optional)</Label>
        <textarea
          id="deck-brief"
          rows={3}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          disabled={disabled || saving}
          placeholder="e.g. 5-slide exec readout — lead with revenue, skip task-level detail"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <Button
        type="button"
        size="sm"
        disabled={disabled || saving}
        onClick={handleSave}
      >
        {saving ? "Saving…" : "Save content focus"}
      </Button>
    </div>
  );
}
