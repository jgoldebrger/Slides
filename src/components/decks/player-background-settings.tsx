"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { clearDeckBackground } from "@/lib/actions/player";
import {
  uploadBackgroundAudioClient,
  uploadBackgroundImageClient,
} from "@/lib/player/upload-background-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
    const fileInput = e.currentTarget.elements.namedItem(
      "file"
    ) as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      toast.error("Choose an audio file");
      return;
    }
    setUploadingAudio(true);
    try {
      const result = await uploadBackgroundAudioClient(deckId, file);
      const err = getActionError(result);
      if (err) toast.error(err);
      else toast.success("Background audio added");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAudio(false);
    }
  }

  async function handleImage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fileInput = e.currentTarget.elements.namedItem(
      "file"
    ) as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) {
      toast.error("Choose an image file");
      return;
    }
    setUploadingImage(true);
    try {
      const result = await uploadBackgroundImageClient(deckId, file);
      const err = getActionError(result);
      if (err) toast.error(err);
      else toast.success("Background image added");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" aria-hidden />
          Background
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Player background</DialogTitle>
          <DialogDescription>
            Optional music and backdrop for this presentation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <form onSubmit={handleAudio} className="space-y-2">
            <Label htmlFor="bg-audio">Background music</Label>
            <Input
              id="bg-audio"
              name="file"
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav"
              disabled={uploadingAudio}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={uploadingAudio}
              >
                {uploadingAudio ? "Uploading…" : "Upload audio"}
              </Button>
              {backgroundAudioUrl ? (
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
              ) : null}
            </div>
          </form>
          <form onSubmit={handleImage} className="space-y-2">
            <Label htmlFor="bg-image">Background image</Label>
            <Input
              id="bg-image"
              name="file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={uploadingImage}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={uploadingImage}
              >
                {uploadingImage ? "Uploading…" : "Upload image"}
              </Button>
              {backgroundImageUrl ? (
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
              ) : null}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
