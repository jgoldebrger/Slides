"use client";

import {
  SLIDE_ANIMATION_LABELS,
  SLIDE_ENTRANCE_ANIMATIONS,
  normalizeSlideAnimationSettings,
  type SlideAnimationSettings,
} from "@/lib/slides/animations";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type SlideAnimationPanelProps = {
  value: SlideAnimationSettings;
  onChange: (value: SlideAnimationSettings) => void;
  onPreview?: () => void;
  hasBullets?: boolean;
};

export function SlideAnimationPanel({
  value,
  onChange,
  onPreview,
  hasBullets = false,
}: SlideAnimationPanelProps) {
  const settings = normalizeSlideAnimationSettings(value);

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Animations</p>
        {onPreview ? (
          <Button type="button" variant="outline" size="sm" onClick={onPreview}>
            Preview
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="slide-entrance-animation">Entrance</Label>
        <select
          id="slide-entrance-animation"
          value={settings.entrance}
          onChange={(e) =>
            onChange({
              ...settings,
              entrance: e.target.value as SlideAnimationSettings["entrance"],
            })
          }
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          {SLIDE_ENTRANCE_ANIMATIONS.map((id) => (
            <option key={id} value={id}>
              {SLIDE_ANIMATION_LABELS[id]}
            </option>
          ))}
        </select>
      </div>

      {settings.entrance !== "none" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.animateContent}
            onChange={(e) =>
              onChange({ ...settings, animateContent: e.target.checked })
            }
            className="accent-link"
          />
          Animate title, body, and bullets separately
        </label>
      ) : null}

      {hasBullets ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.staggerBullets}
            onChange={(e) =>
              onChange({ ...settings, staggerBullets: e.target.checked })
            }
            className="accent-link"
          />
          Reveal bullets one at a time in the player
        </label>
      ) : null}
    </div>
  );
}
