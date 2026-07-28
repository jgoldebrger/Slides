"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  getOrgAiPrefs,
  updateOrgAiPrefsFromNaturalLanguage,
} from "@/lib/actions/ai-platform";
import { LoadingState } from "@/components/shared/state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { OrgAiPrefs } from "@/lib/ai/org-prefs";

export function OrgAiSettingsForm() {
  const [instruction, setInstruction] = useState("");
  const [prefs, setPrefs] = useState<OrgAiPrefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await getOrgAiPrefs();
    setPrefs(data.prefs);
    if (data.prefs.naturalLanguageNotes) {
      setInstruction(data.prefs.naturalLanguageNotes);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave() {
    const trimmed = instruction.trim();
    if (!trimmed) {
      toast.error("Enter AI preferences before saving.");
      return;
    }
    setSaving(true);
    const result = await updateOrgAiPrefsFromNaturalLanguage(trimmed);
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success("AI preferences updated");
      if ("prefs" in result && result.prefs) setPrefs(result.prefs);
      await load();
    }
    setSaving(false);
  }

  if (loading) {
    return <LoadingState message="Loading AI preferences…" />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nl-ai-prefs">Instructions for AI</Label>
        <textarea
          id="nl-ai-prefs"
          rows={4}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder='e.g. "Prefer charts over tables and keep decks under 8 slides."'
          className="flex w-full rounded-md border border-link/20 bg-[var(--color-brand-50)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          These notes guide AI when generating and editing decks for your org.
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        disabled={saving || !instruction.trim()}
        onClick={() => void handleSave()}
      >
        {saving ? "Saving…" : "Save preferences"}
      </Button>
      {prefs?.naturalLanguageNotes ? (
        <p className="rounded-md border border-link/15 bg-link/5 px-3 py-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Active: </span>
          {prefs.naturalLanguageNotes}
        </p>
      ) : null}
    </div>
  );
}
