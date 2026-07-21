"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { refreshSlidesFromUpdates } from "@/lib/actions/decks";
import type { BrandPreviewTheme } from "@/lib/brand";
import { SlideEditorPanel } from "@/components/slides/slide-editor-panel";
import { SlideList } from "@/components/slides/slide-list";
import { SlidePreview } from "@/components/slides/slide-preview";
import { ImageAnnotatorModal } from "@/components/slides/image-annotator-modal";
import { DeckRevisionPanel, type RevisionRow } from "@/components/decks/deck-revision-panel";
import { DeckSharePanel, type ShareLinkRow } from "@/components/decks/deck-share-panel";
import {
  addSlide,
  deleteSlide,
  reorderSlides,
} from "@/lib/actions/slides";
import type { Slide } from "@/types/slide";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type SlideEditorProps = {
  deckId: string;
  initialSlides: Slide[];
  applyBranding?: boolean;
  brandTheme?: BrandPreviewTheme | null;
  deckBackgroundUrl?: string | null;
  initialShareLinks?: ShareLinkRow[];
  initialRevisions?: RevisionRow[];
  deckStatus?: string;
};

export function SlideEditor({
  deckId,
  initialSlides,
  applyBranding = false,
  brandTheme = null,
  deckBackgroundUrl = null,
  initialShareLinks = [],
  initialRevisions = [],
  deckStatus = "ready",
}: SlideEditorProps) {
  const router = useRouter();
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSlides[0]?.id ?? null
  );

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [annotatorOpen, setAnnotatorOpen] = useState(false);

  const selectedSlide = slides.find((s) => s.id === selectedId) ?? null;

  const isGenerating = deckStatus === "generating";

  const handleRefreshFromUpdates = useCallback(async () => {
    if (isGenerating) return;
    setRefreshing(true);
    const result = await refreshSlidesFromUpdates(deckId);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
      setRefreshing(false);
      return;
    }
    toast.success("Refreshing slides from project updates…");
    router.refresh();
    setRefreshing(false);
  }, [deckId, router, isGenerating]);

  const handleReorder = useCallback(
    async (orderedIds: string[]) => {
      const reordered = orderedIds
        .map((id, order) => {
          const slide = slides.find((s) => s.id === id);
          return slide ? { ...slide, order } : null;
        })
        .filter(Boolean) as Slide[];

      setSlides(reordered);
      const result = await reorderSlides(deckId, orderedIds);
      const actionError = getActionError(result); if (actionError) { toast.error(actionError);
      }
    },
    [deckId, slides]
  );

  async function handleAddSlide() {
    const result = await addSlide(deckId);
    const actionError = getActionError(result); if (actionError) { toast.error(actionError);
      return;
    }
    toast.success("Slide added");
    router.refresh();
    if ("data" in result && result.data?.id) {
      const newSlide: Slide = {
        id: result.data.id,
        order: slides.length,
        type: "content",
        layout: "bullets",
        title: "New slide",
        content: { bullets: ["Add content here"] },
      };
      setSlides((prev) => [...prev, newSlide]);
      setSelectedId(result.data.id);
    }
  }

  async function handleDeleteSlide() {
    if (!selectedId) return;
    const result = await deleteSlide(selectedId, deckId);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
      return;
    }
    toast.success("Slide deleted");
    const remaining = slides.filter((s) => s.id !== selectedId);
    setSlides(remaining);
    setSelectedId(remaining[0]?.id ?? null);
    setDeleteOpen(false);
    router.refresh();
  }

  const onSlideUpdate = useCallback((updated: Slide) => {
    setSlides((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  }, []);

  const onBackgroundAppliedToAll = useCallback(
    (result: {
      backgroundImagePath?: string;
      backgroundImageUrl?: string | null;
    }) => {
      setSlides((prev) =>
        prev.map((s) => ({
          ...s,
          content: {
            ...s.content,
            backgroundImagePath: result.backgroundImagePath,
            backgroundImageUrl: result.backgroundImageUrl ?? undefined,
          },
        }))
      );
    },
    []
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr_300px]">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Slides</h2>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void handleRefreshFromUpdates()}
              disabled={refreshing || isGenerating || slides.length === 0}
              title="Re-fill slide content from the latest project updates"
            >
              {refreshing || isGenerating ? "Refreshing…" : "Refresh"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddSlide}
              disabled={isGenerating}
            >
              Add
            </Button>
          </div>
        </div>
        {slides.length > 0 ? (
          <SlideList
            slides={slides}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onReorder={handleReorder}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No slides yet. Approve an outline or click Add.
          </p>
        )}
        {selectedId && slides.length > 1 && (
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive" className="w-full">
                Delete slide
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this slide?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. The slide will be removed from
                  the deck.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteSlide}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <DeckSharePanel deckId={deckId} initialLinks={initialShareLinks} />
        <DeckRevisionPanel
          deckId={deckId}
          initialRevisions={initialRevisions}
        />
      </div>

      <div>
        {selectedSlide ? (
          <>
            <SlidePreview
              key={selectedSlide.id}
              slide={selectedSlide}
              applyBranding={applyBranding}
              brandTheme={brandTheme}
              deckBackgroundUrl={deckBackgroundUrl}
              onImageClick={
                selectedSlide.content.imageUrl
                  ? () => setAnnotatorOpen(true)
                  : undefined
              }
            />
            {selectedSlide.content.imageUrl && (
              <ImageAnnotatorModal
                open={annotatorOpen}
                onOpenChange={setAnnotatorOpen}
                imageUrl={selectedSlide.content.imageUrl}
                deckId={deckId}
                slide={selectedSlide}
                onComplete={onSlideUpdate}
              />
            )}
          </>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-muted text-sm text-muted-foreground">
            Select a slide to preview
          </div>
        )}
      </div>

      <div>
        {selectedSlide ? (
          <SlideEditorPanel
            key={selectedSlide.id}
            slide={selectedSlide}
            deckId={deckId}
            slideCount={slides.length}
            onUpdate={onSlideUpdate}
            onBackgroundAppliedToAll={onBackgroundAppliedToAll}
            onAnnotateImage={
              selectedSlide.content.imageUrl
                ? () => setAnnotatorOpen(true)
                : undefined
            }
          />
        ) : (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Select a slide to edit
          </div>
        )}
      </div>
    </div>
  );
}
