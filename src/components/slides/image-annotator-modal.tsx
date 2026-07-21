"use client";

import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Crop,
  Eraser,
  Highlighter,
  Pencil,
  Redo2,
  Square,
  Type,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  attachSlideVisual,
  polishAnnotatedVisual,
} from "@/lib/actions/visuals";
import {
  ANNOTATOR_COLORS,
  ANNOTATOR_TOOLS,
  type AnnotatorTool,
} from "@/lib/slides/image-annotator";
import type { Slide } from "@/types/slide";
import {
  ImageAnnotatorCanvas,
  type ImageAnnotatorCanvasHandle,
} from "@/components/slides/image-annotator-canvas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TOOL_ICONS: Record<AnnotatorTool, React.ReactNode> = {
  pen: <Pencil className="h-4 w-4" />,
  highlighter: <Highlighter className="h-4 w-4" />,
  rectangle: <Square className="h-4 w-4" />,
  arrow: <ArrowUpRight className="h-4 w-4" />,
  text: <Type className="h-4 w-4" />,
  blur: <Eraser className="h-4 w-4" />,
  crop: <Crop className="h-4 w-4" />,
};

type ImageAnnotatorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  deckId: string;
  slide: Slide;
  onComplete: (slide: Slide) => void;
};

export function ImageAnnotatorModal({
  open,
  onOpenChange,
  imageUrl,
  deckId,
  slide,
  onComplete,
}: ImageAnnotatorModalProps) {
  const canvasRef = useRef<ImageAnnotatorCanvasHandle>(null);
  const [tool, setTool] = useState<AnnotatorTool>("pen");
  const [color, setColor] = useState<string>(ANNOTATOR_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [keepAnnotations, setKeepAnnotations] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);

  function applySlideUpdate(result: {
    imagePath?: string;
    imageUrl?: string | null;
  }) {
    onComplete({
      ...slide,
      content: {
        ...slide.content,
        imagePath: result.imagePath ?? slide.content.imagePath,
        imageUrl: result.imageUrl ?? undefined,
        imageAlt: slide.content.imageAlt ?? slide.title,
      },
    });
  }

  async function exportBlob(): Promise<Blob | null> {
    const blob = await canvasRef.current?.toBlob();
    if (!blob) {
      toast.error("Could not export annotated image");
      return null;
    }
    return blob;
  }

  async function handleApply() {
    setBusy(true);
    try {
      const blob = await exportBlob();
      if (!blob) return;
      const formData = new FormData();
      formData.set("file", new File([blob], "annotated.png", { type: "image/png" }));
      const result = await attachSlideVisual(deckId, slide.id, formData);
      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        return;
      }
      if (!("imagePath" in result)) return;
      toast.success("Image applied to slide");
      applySlideUpdate(result);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply image");
    } finally {
      setBusy(false);
    }
  }

  async function handlePolish() {
    setBusy(true);
    try {
      const blob = await exportBlob();
      if (!blob) return;
      const formData = new FormData();
      formData.set("file", new File([blob], "annotated.png", { type: "image/png" }));
      formData.set("keepAnnotations", keepAnnotations ? "true" : "false");
      if (instructions.trim()) formData.set("instructions", instructions.trim());

      const result = await polishAnnotatedVisual(deckId, slide.id, formData);
      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        return;
      }
      if (!("generationId" in result) || !result.generationId) {
        toast.error("Failed to start polish job");
        return;
      }

      toast.message("Polishing with AI…");
      const { pollAiGeneration } = await import(
        "@/lib/hooks/poll-ai-generation"
      );
      const done = await pollAiGeneration(deckId, result.generationId);
      toast.success("Image polished");
      applySlideUpdate(
        done.result as { imagePath?: string; imageUrl?: string | null }
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Polish failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Annotate image</DialogTitle>
          <DialogDescription>
            Mark up your visual, then apply as-is or polish with AI. Highlights
            and arrows guide the AI when rebuilding.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          {ANNOTATOR_TOOLS.map((t) => (
            <Button
              key={t.id}
              type="button"
              size="sm"
              variant={tool === t.id ? "default" : "outline"}
              onClick={() => setTool(t.id)}
              disabled={busy}
              title={t.label}
              aria-label={t.label}
            >
              {TOOL_ICONS[t.id]}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => canvasRef.current?.undo()}
            disabled={busy}
            title="Undo"
            aria-label="Undo"
          >
            <Redo2 className="h-4 w-4 rotate-180" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => canvasRef.current?.clearAnnotations()}
            disabled={busy}
          >
            Clear
          </Button>
          {tool === "crop" && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => canvasRef.current?.applyCrop()}
              disabled={busy}
            >
              Apply crop
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {ANNOTATOR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "h-6 w-6 rounded-full border border-border",
                  color === c && "ring-2 ring-ring ring-offset-1"
                )}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                disabled={busy || tool === "highlighter"}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="stroke-width" className="text-xs whitespace-nowrap">
              Stroke
            </Label>
            <input
              id="stroke-width"
              type="range"
              min={1}
              max={12}
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(Number(e.target.value))}
              disabled={busy}
              className="w-24"
            />
          </div>
        </div>

        <ImageAnnotatorCanvas
          ref={canvasRef}
          imageUrl={imageUrl}
          tool={tool}
          color={color}
          strokeWidth={strokeWidth}
        />

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="polish-instructions">
              Polish instructions (optional)
            </Label>
            <Input
              id="polish-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. corporate style, sharper labels, brand colors"
              disabled={busy}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={keepAnnotations}
              onChange={(e) => setKeepAnnotations(e.target.checked)}
              disabled={busy}
              className="h-4 w-4 rounded border-input"
            />
            Keep annotations on polished image
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button type="button" variant="secondary" onClick={handleApply} disabled={busy}>
            Apply to slide
          </Button>
          <Button type="button" onClick={handlePolish} disabled={busy} className="gap-1.5">
            <Wand2 className="h-4 w-4" />
            {busy ? "Working…" : "Polish with AI"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
