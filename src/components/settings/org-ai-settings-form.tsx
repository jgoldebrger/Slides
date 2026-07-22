"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  getOrgAiPrefs,
  updateOrgAiPrefsFromNaturalLanguage,
} from "@/lib/actions/ai-platform";
import { OrgAiFeatureCatalog } from "@/components/settings/org-ai-feature-catalog";
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
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="nl-ai-prefs">Natural-language AI preferences</Label>
        <textarea
          id="nl-ai-prefs"
          rows={3}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder='e.g. "Always prefer charts over tables and keep decks under 8 slides"'
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Button
          type="button"
          size="sm"
          disabled={saving || !instruction.trim()}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving…" : "Save AI preferences"}
        </Button>
      </div>
      {prefs?.naturalLanguageNotes && (
        <p className="text-sm text-muted-foreground">
          Active notes: {prefs.naturalLanguageNotes}
        </p>
      )}

      <OrgAiFeatureCatalog />
    </div>
  );
}
