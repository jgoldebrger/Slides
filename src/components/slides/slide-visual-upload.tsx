"use client";

import { useRef, useState } from "react";
import { ImagePlus, Pencil, Upload, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { resolveVisualActionResult } from "@/lib/actions/resolve-visual-result";
import {
  attachSlideVisual,
  createSlideVisual,
  finishSlideVisual,
} from "@/lib/actions/visuals";
import { VISUAL_STYLES } from "@/lib/ai/visuals";
import type { Slide } from "@/types/slide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SlideVisualUploadProps = {
  slide: Slide;
  deckId: string;
  onVisualReady: (slide: Slide) => void;
  onAnnotateImage?: () => void;
};

export function SlideVisualUpload({
  slide,
  deckId,
  onVisualReady,
  onAnnotateImage,
}: SlideVisualUploadProps) {
  const refineFormRef = useRef<HTMLFormElement>(null);
  const attachFormRef = useRef<HTMLFormElement>(null);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(slide.content.imageUrl);
  const [visualStyle, setVisualStyle] = useState("illustration");

  function applyResult(result: {
    imagePath?: string;
    imageUrl?: string | null;
    layout?: Slide["layout"];
  }) {
    if (result.imageUrl) setPreviewUrl(result.imageUrl);

    onVisualReady({
      ...slide,
      layout: slide.layout,
      content: {
        ...slide.content,
        imagePath: result.imagePath,
        imageUrl: result.imageUrl ?? undefined,
        imageAlt: slide.title,
      },
    });
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGenerating(true);

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("style", visualStyle);

      const result = await createSlideVisual(deckId, slide.id, formData);
      toast.message("Creating image…");
      const visualResult = await resolveVisualActionResult(deckId, result);
      toast.success("Image created");
      applyResult(visualResult as {
        imagePath?: string;
        imageUrl?: string | null;
        layout?: Slide["layout"];
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Visual generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRefine(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGenerating(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await finishSlideVisual(deckId, slide.id, formData);
      toast.message("Refining visual…");
      const visualResult = await resolveVisualActionResult(deckId, result);
      toast.success("Visual refined");
      applyResult(visualResult as {
        imagePath?: string;
        imageUrl?: string | null;
        layout?: Slide["layout"];
      });
      refineFormRef.current?.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Visual generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleAttach(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGenerating(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await attachSlideVisual(deckId, slide.id, formData);
      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        return;
      }
      if (!("imagePath" in result)) return;
      toast.success("Image attached to slide");
      applyResult(result);
      attachFormRef.current?.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
      <div>
        <h4 className="text-sm font-medium">AI visuals</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Generate, upload, annotate, or refine slide images. Text on the slide
          is kept — images appear beside bullets or body text.
        </p>
      </div>

      {previewUrl && (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-md border border-border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={slide.content.imageAlt ?? slide.title}
              className="max-h-36 w-full object-contain"
            />
          </div>
          {onAnnotateImage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={onAnnotateImage}
              disabled={generating}
            >
              <Pencil className="h-3.5 w-3.5" />
              Annotate image
            </Button>
          )}
        </div>
      )}

      <Tabs defaultValue="create">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create" className="gap-1.5 text-xs">
            <ImagePlus className="h-3.5 w-3.5" />
            Create
          </TabsTrigger>
          <TabsTrigger value="upload" className="gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="refine" className="gap-1.5 text-xs">
            <Wand2 className="h-3.5 w-3.5" />
            Refine
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <form onSubmit={handleCreate} className="space-y-3 pt-2">
            <div className="space-y-2">
              <Label htmlFor="create-style">Visual style</Label>
              <select
                id="create-style"
                value={visualStyle}
                onChange={(e) => setVisualStyle(e.target.value)}
                disabled={generating}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {VISUAL_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-instructions">Instructions (optional)</Label>
              <Input
                id="create-instructions"
                name="instructions"
                placeholder="e.g. show team collaboration, highlight Q3 milestone"
                disabled={generating}
              />
            </div>
            <Button type="submit" disabled={generating} className="w-full">
              {generating ? "Creating image…" : "Generate image"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="upload">
          <form
            ref={attachFormRef}
            onSubmit={handleAttach}
            className="space-y-3 pt-2"
          >
            <div className="space-y-2">
              <Label htmlFor="attach-file">Use image as-is</Label>
              <Input
                id="attach-file"
                name="file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                disabled={generating}
              />
              <p className="text-xs text-muted-foreground">
                Attach a screenshot or photo without AI. Annotate it afterward.
              </p>
            </div>
            <Button type="submit" disabled={generating} className="w-full">
              {generating ? "Uploading…" : "Attach to slide"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="refine">
          <form
            ref={refineFormRef}
            onSubmit={handleRefine}
            className="space-y-3 pt-2"
          >
            <div className="space-y-2">
              <Label htmlFor="visual-file">Upload draft visual</Label>
              <Input
                id="visual-file"
                name="file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                disabled={generating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="visual-instructions">Instructions (optional)</Label>
              <Input
                id="visual-instructions"
                name="instructions"
                placeholder="e.g. polish chart labels, corporate blue theme"
                disabled={generating}
              />
            </div>
            <Button type="submit" disabled={generating} className="w-full">
              {generating ? "Refining visual…" : "Refine uploaded image"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
      <p
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {generating ? "AI visual job in progress. Please wait." : ""}
      </p>
    </div>
  );
}
