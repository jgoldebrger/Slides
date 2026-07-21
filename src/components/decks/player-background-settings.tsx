"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  clearDeckBackground,
  uploadDeckBackgroundAudio,
  uploadDeckBackgroundImage,
} from "@/lib/actions/player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PlayerBackgroundSettingsProps = {
  deckId: string;
  backgroundAudioUrl?: string | null;
  backgroundImageUrl?: string | null;
};

export function PlayerBackgroundSettings({
  deckId,
  backgroundAudioUrl,
  backgroundImageUrl,
}: PlayerBackgroundSettingsProps) {
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  async function handleAudio(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadingAudio(true);
    const result = await uploadDeckBackgroundAudio(
      deckId,
      new FormData(e.currentTarget)
    );
    const err = getActionError(result);
    if (err) toast.error(err);
    else toast.success("Background audio added");
    setUploadingAudio(false);
    (e.target as HTMLFormElement).reset();
  }

  async function handleImage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadingImage(true);
    const result = await uploadDeckBackgroundImage(
      deckId,
      new FormData(e.currentTarget)
    );
    const err = getActionError(result);
    if (err) toast.error(err);
    else toast.success("Background image added");
    setUploadingImage(false);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-muted/40 p-4">
      <form onSubmit={handleAudio} className="space-y-2">
        <Label htmlFor="bg-audio" className="text-xs">
          Background music
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="bg-audio"
            name="file"
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav"
            className="max-w-[200px] text-xs"
            disabled={uploadingAudio}
          />
          <Button type="submit" size="sm" variant="outline" disabled={uploadingAudio}>
            {uploadingAudio ? "…" : "Upload"}
          </Button>
          {backgroundAudioUrl && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={async () => {
                const r = await clearDeckBackground(deckId, "audio");
                if (getActionError(r)) toast.error(getActionError(r)!);
                else toast.success("Audio removed");
              }}
            >
              Remove
            </Button>
          )}
        </div>
      </form>
      <form onSubmit={handleImage} className="space-y-2">
        <Label htmlFor="bg-image" className="text-xs">
          Background image
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="bg-image"
            name="file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="max-w-[200px] text-xs"
            disabled={uploadingImage}
          />
          <Button type="submit" size="sm" variant="outline" disabled={uploadingImage}>
            {uploadingImage ? "…" : "Upload"}
          </Button>
          {backgroundImageUrl && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={async () => {
                const r = await clearDeckBackground(deckId, "image");
                if (getActionError(r)) toast.error(getActionError(r)!);
                else toast.success("Image removed");
              }}
            >
              Remove
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
