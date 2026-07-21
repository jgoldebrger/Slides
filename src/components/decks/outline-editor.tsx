"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { captureEvent } from "@/components/analytics/posthog-provider";
import { getActionError } from "@/lib/action-result";
import {
  AUTOSAVE_DEBOUNCE_MS,
  useDebouncedEffect,
} from "@/lib/hooks/use-debounce";
import {
  enqueueOutlineGeneration,
  getOutlineJobStatus,
  saveOutline,
  approveOutline,
} from "@/lib/actions/decks";
import { updateDeckAudience } from "@/lib/actions/ai-enhancements";
import {
  DECK_AUDIENCES,
  DECK_AUDIENCE_LABELS,
  type DeckAudience,
} from "@/lib/ai/audience";
import { SLIDE_LAYOUTS } from "@/types/slide";
import type { DeckOutline, OutlineSlide } from "@/types/slide";
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

type OutlineEditorProps = {
  deckId: string;
  deckName: string;
  initialOutline: DeckOutline | null;
  deckStatus: string;
  initialAudience?: DeckAudience;
};

export function OutlineEditor({
  deckId,
  deckName,
  initialOutline,
  deckStatus,
  initialAudience = "general",
}: OutlineEditorProps) {
  const router = useRouter();
  const [outline, setOutline] = useState<DeckOutline | null>(initialOutline);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const [audience, setAudience] = useState<DeckAudience>(initialAudience);
  const [streaming, setStreaming] = useState(false);

  const persistOutline = useCallback(async () => {
    if (!outline || !dirty) return;
    setSaving(true);
    const result = await saveOutline(deckId, outline);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
    } else {
      setDirty(false);
      setAutoSaved(true);
      router.refresh();
    }
    setSaving(false);
  }, [outline, dirty, deckId, router]);

  useDebouncedEffect(
    () => {
      void persistOutline();
    },
    [outline],
    AUTOSAVE_DEBOUNCE_MS,
    { skipFirst: true, enabled: dirty }
  );

  const pollOutlineJob = useCallback(async () => {
    const status = await getOutlineJobStatus(deckId);

    if (status.generationStatus === "completed" && status.outline) {
      setOutline(status.outline);
      setGenerating(false);
      toast.success("Outline generated");
      router.refresh();
      return true;
    }

    if (status.generationStatus === "failed") {
      setGenerating(false);
      toast.error(status.error ?? "Outline generation failed");
      return true;
    }

    return false;
  }, [deckId, router]);

  useEffect(() => {
    if (!generating) return;

    const interval = setInterval(async () => {
      const done = await pollOutlineJob();
      if (done) clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
  }, [generating, pollOutlineJob]);

  async function handleGenerate() {
    if (outline) {
      setConfirmRegenerateOpen(true);
      return;
    }
    await runGenerate();
  }

  async function runGenerate(useStream = true) {
    setConfirmRegenerateOpen(false);
    setGenerating(true);

    if (useStream) {
      setStreaming(true);
      try {
        const res = await fetch(`/api/decks/${deckId}/outline/stream`, {
          method: "POST",
        });
        if (!res.ok || !res.body) {
          throw new Error("Stream unavailable");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as {
              type: string;
              outline?: DeckOutline;
              error?: string;
            };
            if (event.type === "partial" && event.outline) {
              setOutline(event.outline);
            }
            if (event.type === "complete" && event.outline) {
              setOutline(event.outline);
              toast.success("Outline generated");
              router.refresh();
            }
            if (event.type === "error") {
              throw new Error(event.error ?? "Stream failed");
            }
          }
        }
        setDirty(false);
        setGenerating(false);
        setStreaming(false);
        return;
      } catch {
        setStreaming(false);
        toast.message("Falling back to standard generation…");
      }
    }

    const result = await enqueueOutlineGeneration(deckId);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
      setGenerating(false);
      return;
    }

    const done = await pollOutlineJob();
    if (!done) {
      toast.info("Generating outline…");
    }
    setDirty(false);
  }

  async function handleAudienceChange(next: DeckAudience) {
    setAudience(next);
    const result = await updateDeckAudience(deckId, next);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
      return;
    }
    toast.success(`Audience set to ${DECK_AUDIENCE_LABELS[next]}`);
  }

  async function handleSave() {
    if (!outline) return;
    setSaving(true);
    const result = await saveOutline(deckId, outline);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
    } else {
      toast.success("Outline saved");
      setDirty(false);
      setAutoSaved(true);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleApprove() {
    setApproving(true);
    const result = await approveOutline(deckId);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
      setApproving(false);
      return;
    }

    captureEvent("outline_approved", { deck_id: deckId });
    toast.success("Outline approved — generating slides");
    router.push(`/decks/${deckId}/editor`);
    router.refresh();
    setApproving(false);
  }

  function updateSlide(index: number, field: keyof OutlineSlide, value: string) {
    if (!outline) return;
    const slides = [...outline.slides];
    slides[index] = { ...slides[index], [field]: value };
    setOutline({ ...outline, slides });
    setDirty(true);
  }

  function addSlide() {
    if (!outline) return;
    setOutline({
      ...outline,
      slides: [
        ...outline.slides,
        { title: "New slide", layout: "bullets", type: "content", summary: "" },
      ],
    });
    setDirty(true);
  }

  function removeSlide(index: number) {
    if (!outline) return;
    setOutline({
      ...outline,
      slides: outline.slides.filter((_, i) => i !== index),
    });
    setDirty(true);
    setRemoveIndex(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label htmlFor="outline-audience">Target audience</Label>
          <select
            id="outline-audience"
            value={audience}
            onChange={(e) =>
              void handleAudienceChange(e.target.value as DeckAudience)
            }
            disabled={generating}
            className="flex h-10 min-w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {DECK_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {DECK_AUDIENCE_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={outline ? "outline" : "default"}
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? "Generating…" : outline ? "Regenerate" : "Generate outline"}
        </Button>
        {outline && (
          <>
            {saving ? (
              <span className="text-sm text-muted-foreground">Saving…</span>
            ) : autoSaved && !dirty ? (
              <span className="text-sm text-muted-foreground">Saved</span>
            ) : null}
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save now"}
            </Button>
            <Button onClick={handleApprove} disabled={approving || generating}>
              {approving ? "Approving…" : "Approve & generate slides"}
            </Button>
          </>
        )}
        {(deckStatus === "approved" ||
          deckStatus === "ready" ||
          deckStatus === "generating" ||
          deckStatus === "failed") && (
          <Button variant="secondary" onClick={() => router.push(`/decks/${deckId}/editor`)}>
            Open editor
          </Button>
        )}
      </div>

      {generating && (
        <p className="text-sm text-muted-foreground" role="status">
          {streaming
            ? "Streaming outline slides as they are generated…"
            : "AI is building your outline from project updates…"}
        </p>
      )}

      {!outline ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-6 py-16 text-center">
          <p className="text-muted-foreground">
            No outline yet for <strong>{deckName}</strong>.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate an AI outline from your project updates.
          </p>
          <Button
            className="mt-6"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating…" : "Generate outline"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {outline.slides.map((slide, index) => (
            <div
              key={index}
              className="space-y-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Slide {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRemoveIndex(index)}
                >
                  Remove
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`outline-title-${index}`}>Title</Label>
                  <Input
                    id={`outline-title-${index}`}
                    value={slide.title}
                    onChange={(e) => updateSlide(index, "title", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`outline-layout-${index}`}>Layout</Label>
                  <select
                    id={`outline-layout-${index}`}
                    value={slide.layout}
                    onChange={(e) => updateSlide(index, "layout", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {SLIDE_LAYOUTS.map((l) => (
                      <option key={l} value={l}>
                        {l.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`outline-summary-${index}`}>Summary</Label>
                <textarea
                  id={`outline-summary-${index}`}
                  rows={2}
                  value={slide.summary}
                  onChange={(e) => updateSlide(index, "summary", e.target.value)}
                  className="flex w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addSlide}>
            Add slide
          </Button>
        </div>
      )}

      <Dialog open={confirmRegenerateOpen} onOpenChange={setConfirmRegenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dirty ? "Discard unsaved outline changes?" : "Regenerate outline?"}
            </DialogTitle>
            <DialogDescription>
              Regenerating replaces your{" "}
              {dirty ? "edited outline" : "current outline"} with a new AI draft
              from project updates. If this deck already has slides, the same
              slide count and structure will be preserved. To update slide text
              only, use Refresh in the editor instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRegenerateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void runGenerate()}>Regenerate outline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removeIndex !== null}
        onOpenChange={(next) => {
          if (!next) setRemoveIndex(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this outline slide?</DialogTitle>
            <DialogDescription>
              Slide {(removeIndex ?? 0) + 1} will be removed from the outline.
              Save or approve afterward to keep the change.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveIndex(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (removeIndex !== null) removeSlide(removeIndex);
              }}
            >
              Remove slide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
