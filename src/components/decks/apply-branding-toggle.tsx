"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { updateApplyBranding } from "@/lib/actions/decks";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ApplyBrandingToggleProps = {
  deckId: string;
  initialValue: boolean;
  className?: string;
};

export function ApplyBrandingToggle({
  deckId,
  initialValue,
  className,
}: ApplyBrandingToggleProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: boolean) {
    setEnabled(next);
    setSaving(true);
    const result = await updateApplyBranding(deckId, next);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
      setEnabled(!next);
    } else {
      toast.success(next ? "Branding enabled" : "Branding disabled");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 px-4 py-3",
        className
      )}
    >
      <div>
        <Label htmlFor={`apply-branding-${deckId}`} className="font-medium">
          Apply brand kit
        </Label>
        <p className="text-sm text-muted-foreground">
          Use org colors, logo, and fonts in preview and export.
        </p>
      </div>
      <input
        id={`apply-branding-${deckId}`}
        type="checkbox"
        checked={enabled}
        disabled={saving}
        onChange={(e) => void handleChange(e.target.checked)}
        className="h-4 w-4 rounded border-input"
        aria-label="Apply brand kit to this deck"
      />
    </div>
  );
}
