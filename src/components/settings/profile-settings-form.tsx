"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  AUTOSAVE_DEBOUNCE_MS,
  useDebouncedEffect,
} from "@/lib/hooks/use-debounce";
import { updateProfileSettings } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileSettingsFormProps = {
  initial: {
    displayName: string;
    email: string;
    notifyExportReady: boolean;
    notifyTeamInvites: boolean;
  };
};

export function ProfileSettingsForm({ initial }: ProfileSettingsFormProps) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [notifyExportReady, setNotifyExportReady] = useState(
    initial.notifyExportReady
  );
  const [notifyTeamInvites, setNotifyTeamInvites] = useState(
    initial.notifyTeamInvites
  );
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(false);

  const persistSettings = useCallback(async () => {
    setSaving(true);
    const result = await updateProfileSettings({
      displayName,
      notifyExportReady,
      notifyTeamInvites,
    });
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      setLastSaved(true);
    }
    setSaving(false);
  }, [displayName, notifyExportReady, notifyTeamInvites]);

  useDebouncedEffect(
    () => {
      void persistSettings();
    },
    [displayName, notifyExportReady, notifyTeamInvites],
    AUTOSAVE_DEBOUNCE_MS,
    { skipFirst: true }
  );

  async function handleSaveNow() {
    await persistSettings();
    toast.success("Settings saved");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          {saving ? "Saving…" : lastSaved ? "Saved" : "Changes autosave"}
        </span>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={initial.email} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={notifyExportReady}
          onChange={(e) => setNotifyExportReady(e.target.checked)}
        />
        Email me when exports are ready
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={notifyTeamInvites}
          onChange={(e) => setNotifyTeamInvites(e.target.checked)}
        />
        Email me about team invitations
      </label>
      <Button onClick={handleSaveNow} disabled={saving} variant="outline">
        {saving ? "Saving…" : "Save now"}
      </Button>
    </div>
  );
}
