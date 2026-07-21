"use client";

import { useState } from "react";
import { Copy, ImagePlus, Upload } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  applyBackgroundToAllSlides,
  clearDeckBackgroundAll,
  clearSlideBackground,
  createDeckBackground,
  createSlideBackground,
  uploadDeckBackgroundForAll,
  uploadSlideBackground,
} from "@/lib/actions/slide-backgrounds";
import { BACKGROUND_STYLES } from "@/lib/ai/visuals";
import type { Slide } from "@/types/slide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SlideBackgroundPanelProps = {
  slide: Slide;
  deckId: string;
  slideCount: number;
  onBackgroundChange: (slide: Slide) => void;
  onBackgroundAppliedToAll?: (result: {
    backgroundImagePath?: string;
    backgroundImageUrl?: string | null;
  }) => void;
};

export function SlideBackgroundPanel({
  slide,
  deckId,
  slideCount,
  onBackgroundChange,
  onBackgroundAppliedToAll,
}: SlideBackgroundPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [applyingAll, setApplyingAll] = useState(false);
  const [scope, setScope] = useState<"slide" | "deck">("slide");
  const [style, setStyle] = useState("gradient");
  const previewUrl = slide.content.backgroundImageUrl;

  function applyBackground(result: {
    backgroundImagePath?: string;
    backgroundImageUrl?: string | null;
    content?: Record<string, unknown>;
  }) {
    onBackgroundChange({
      ...slide,
      content: {
        ...slide.content,
        ...(result.content as Slide["content"]),
        backgroundImagePath: result.backgroundImagePath,
        backgroundImageUrl: result.backgroundImageUrl ?? undefined,
      },
    });
  }

  function handleDeckWideResult(result: {
    backgroundImagePath?: string;
    backgroundImageUrl?: string | null;
    appliedCount?: number;
  }) {
    onBackgroundAppliedToAll?.(result);
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("style", style);

    const result =
      scope === "deck"
        ? await uploadDeckBackgroundForAll(deckId, formData)
        : await uploadSlideBackground(deckId, slide.id, formData);

    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
    } else {
      const ok = result as {
        backgroundImagePath?: string;
        backgroundImageUrl?: string | null;
        appliedCount?: number;
        content?: Record<string, unknown>;
      };
      const applied = ok.appliedCount ?? slideCount;
      toast.success(
        scope === "deck"
          ? `Background applied to all ${applied} slides`
          : "Background uploaded"
      );
      if (scope === "deck") {
        handleDeckWideResult(ok);
      } else {
        applyBackground(ok);
      }
      (e.target as HTMLFormElement).reset();
    }
    setUploading(false);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGenerating(true);
    const formData = new FormData(e.currentTarget);
    formData.set("style", style);

    try {
      const result =
        scope === "deck"
          ? await createDeckBackground(deckId, formData)
          : await createSlideBackground(deckId, slide.id, formData);

      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        return;
      }
      if (!("generationId" in result) || !result.generationId) {
        toast.error("Failed to start background generation");
        return;
      }

      toast.message(
        scope === "deck"
          ? "Creating deck background…"
          : "Creating slide background…"
      );
      const { pollAiGeneration } = await import(
        "@/lib/hooks/poll-ai-generation"
      );
      const done = await pollAiGeneration(deckId, result.generationId);
      const ok = (done.result ?? {}) as {
        backgroundImagePath?: string;
        backgroundImageUrl?: string | null;
        appliedCount?: number;
        content?: Record<string, unknown>;
      };
      const applied = ok.appliedCount ?? slideCount;
      toast.success(
        scope === "deck"
          ? `Background created for all ${applied} slides`
          : "Background created"
      );
      if (scope === "deck") {
        handleDeckWideResult(ok);
      } else {
        applyBackground(ok);
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Background generation failed"
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleApplyCurrentToAll() {
    setApplyingAll(true);
    const result = await applyBackgroundToAllSlides(deckId, slide.id);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
    } else {
      const ok = result as {
        backgroundImagePath?: string;
        backgroundImageUrl?: string | null;
        appliedCount?: number;
      };
      toast.success(
        `Background applied to all ${ok.appliedCount ?? slideCount} slides`
      );
      handleDeckWideResult(ok);
    }
    setApplyingAll(false);
  }

  async function handleClear() {
    const result =
      scope === "deck"
        ? await clearDeckBackgroundAll(deckId)
        : await clearSlideBackground(deckId, slide.id);

    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
    } else {
      toast.success(
        scope === "deck"
          ? "Background removed from all slides"
          : "Background removed"
      );
      if (scope === "deck") {
        onBackgroundAppliedToAll?.({
          backgroundImagePath: undefined,
          backgroundImageUrl: null,
        });
      } else {
        applyBackground(result);
      }
    }
  }

  const busy = generating || uploading || applyingAll;
  const applyToAllLabel =
    slideCount > 1 ? `Apply to all ${slideCount} slides` : "Apply to all slides";

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
      <div>
        <h4 className="text-sm font-medium">Slide background</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload or generate a subtle background. Choose whether it applies to
          this slide only or the entire deck.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Apply to</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            variant={scope === "slide" ? "default" : "outline"}
            onClick={() => setScope("slide")}
            disabled={busy}
          >
            This slide
          </Button>
          <Button
            type="button"
            size="sm"
            variant={scope === "deck" ? "default" : "outline"}
            onClick={() => setScope("deck")}
            disabled={busy}
          >
            Entire deck
          </Button>
        </div>
      </div>

      {previewUrl && (
        <div
          className="aspect-video overflow-hidden rounded-md border border-border bg-cover bg-center"
          style={{ backgroundImage: `url(${previewUrl})` }}
        >
          <div className="flex h-full items-center justify-center bg-white/70 text-xs text-muted-foreground">
            Preview with text overlay
          </div>
        </div>
      )}

      <Tabs defaultValue="create">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create" className="gap-1.5 text-xs">
            <ImagePlus className="h-3.5 w-3.5" />
            AI create
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" />
            Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label htmlFor="bg-style">Style</Label>
              <select
                id="bg-style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                disabled={busy}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {BACKGROUND_STYLES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bg-instructions">Extra direction (optional)</Label>
              <Input
                id="bg-instructions"
                name="instructions"
                placeholder="e.g. cooler tones, more texture"
                disabled={busy}
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {generating
                ? "Creating background…"
                : scope === "deck"
                  ? "Generate for entire deck"
                  : "Generate background"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="upload">
          <form onSubmit={handleUpload} className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label htmlFor="bg-file">Background image</Label>
              <Input
                id="bg-file"
                name="file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                disabled={busy}
              />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {uploading
                ? "Uploading…"
                : scope === "deck"
                  ? "Upload for entire deck"
                  : "Upload background"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {scope === "slide" && previewUrl && slideCount > 1 && (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => void handleApplyCurrentToAll()}
          disabled={busy}
        >
          <Copy className="mr-2 h-4 w-4" />
          {applyingAll ? "Applying…" : applyToAllLabel}
        </Button>
      )}

      {previewUrl && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => void handleClear()}
          disabled={busy}
        >
          {scope === "deck" ? "Remove from all slides" : "Remove background"}
        </Button>
      )}
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {generating
          ? "Generating background. Please wait."
          : uploading
            ? "Uploading background. Please wait."
            : applyingAll
              ? "Applying background to all slides. Please wait."
              : ""}
      </p>
    </div>
  );
}
