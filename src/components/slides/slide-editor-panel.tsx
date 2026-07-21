"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { rewriteSlide } from "@/lib/actions/decks";
import { updateSlide } from "@/lib/actions/slides";
import { SLIDE_LAYOUTS } from "@/types/slide";
import type { Slide, SlideContent, SlideLayout } from "@/types/slide";
import { LAYOUT_CONTRACT } from "@/lib/slides/layout-contract";
import {
  formatMetricsText,
  parseMetricsText,
  remapSlideContentForLayout,
} from "@/lib/slides/remap-content";
import { SlideVisualUpload } from "@/components/slides/slide-visual-upload";
import { SlideBackgroundPanel } from "@/components/slides/slide-background-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AUTOSAVE_DEBOUNCE_MS,
  useDebouncedEffect,
} from "@/lib/hooks/use-debounce";

type SlideEditorPanelProps = {
  slide: Slide;
  deckId: string;
  slideCount: number;
  onUpdate: (slide: Slide) => void;
  onBackgroundAppliedToAll?: (result: {
    backgroundImagePath?: string;
    backgroundImageUrl?: string | null;
  }) => void;
  onAnnotateImage?: () => void;
};

function buildContentFromFields({
  base,
  body,
  bullets,
  metricsText,
  quote,
  attribution,
}: {
  base: SlideContent;
  body: string;
  bullets: string;
  metricsText: string;
  quote: string;
  attribution: string;
}): SlideContent {
  return {
    ...base,
    body: body.trim() || undefined,
    bullets: bullets.split("\n").map((l) => l.trim()).filter(Boolean),
    metrics: parseMetricsText(metricsText),
    quote: quote.trim() || undefined,
    attribution: attribution.trim() || undefined,
  };
}

export function SlideEditorPanel({
  slide,
  deckId,
  slideCount,
  onUpdate,
  onBackgroundAppliedToAll,
  onAnnotateImage,
}: SlideEditorPanelProps) {
  const [title, setTitle] = useState(slide.title);
  const [layout, setLayout] = useState<SlideLayout>(slide.layout);
  const [body, setBody] = useState(slide.content.body ?? "");
  const [bullets, setBullets] = useState(
    (slide.content.bullets ?? []).join("\n")
  );
  const [metricsText, setMetricsText] = useState(
    formatMetricsText(slide.content.metrics)
  );
  const [quote, setQuote] = useState(slide.content.quote ?? "");
  const [attribution, setAttribution] = useState(
    slide.content.attribution ?? ""
  );
  const [speakerNotes, setSpeakerNotes] = useState(slide.speakerNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [rewriting, setRewriting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const slideRef = useRef(slide);
  const onUpdateRef = useRef(onUpdate);
  const layoutRef = useRef(layout);

  useEffect(() => {
    slideRef.current = slide;
  }, [slide]);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  const slots = LAYOUT_CONTRACT[layout].slots;

  const persistSlide = useCallback(async () => {
    const currentSlide = slideRef.current;
    setSaving(true);

    const content = buildContentFromFields({
      base: currentSlide.content,
      body,
      bullets,
      metricsText,
      quote,
      attribution,
    });

    const payload = {
      title,
      layout: layoutRef.current,
      type: currentSlide.type,
      content,
      speaker_notes: speakerNotes,
    };

    const result = await updateSlide(currentSlide.id, deckId, payload);
    const actionError = getActionError(result);

    if (actionError) {
      toast.error(actionError);
    } else {
      setLastSaved(new Date());
      const updated: Slide = {
        ...currentSlide,
        title,
        layout: layoutRef.current,
        content,
        speakerNotes,
      };
      slideRef.current = updated;
      onUpdateRef.current(updated);
    }

    setSaving(false);
  }, [
    title,
    body,
    bullets,
    metricsText,
    quote,
    attribution,
    speakerNotes,
    deckId,
  ]);

  useDebouncedEffect(
    () => {
      void persistSlide();
    },
    [title, layout, body, bullets, metricsText, quote, attribution, speakerNotes],
    AUTOSAVE_DEBOUNCE_MS,
    { skipFirst: true }
  );

  function applyContentToFields(content: SlideContent) {
    setBody(content.body ?? "");
    setBullets((content.bullets ?? []).join("\n"));
    setMetricsText(formatMetricsText(content.metrics));
    setQuote(content.quote ?? "");
    setAttribution(content.attribution ?? "");
  }

  function handleLayoutChange(next: SlideLayout) {
    const prev = layoutRef.current;
    if (next === prev) return;

    const currentContent = buildContentFromFields({
      base: slideRef.current.content,
      body,
      bullets,
      metricsText,
      quote,
      attribution,
    });
    const remapped = remapSlideContentForLayout(prev, next, currentContent);

    setLayout(next);
    layoutRef.current = next;
    applyContentToFields(remapped);

    const updated: Slide = {
      ...slideRef.current,
      title,
      layout: next,
      content: remapped,
      speakerNotes,
    };
    slideRef.current = updated;
    onUpdateRef.current(updated);
  }

  async function handleRewrite() {
    setRewriting(true);

    try {
      const result = await rewriteSlide(slide.id, deckId);
      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        return;
      }

      if (!("generationId" in result) || !result.generationId) {
        toast.error("Failed to start rewrite");
        return;
      }

      toast.message("Rewriting slide…");
      const { pollAiGeneration } = await import(
        "@/lib/hooks/poll-ai-generation"
      );
      const done = await pollAiGeneration(deckId, result.generationId);
      const rewritten = done.result as {
        title?: string;
        content?: Slide["content"];
        speakerNotes?: string | null;
      } | null;

      if (!rewritten?.title || !rewritten.content) {
        toast.error("Rewrite completed without slide data");
        return;
      }

      toast.success("Slide rewritten");
      setTitle(rewritten.title);
      applyContentToFields(rewritten.content);
      if (rewritten.speakerNotes) {
        setSpeakerNotes(rewritten.speakerNotes);
      }
      const updated: Slide = {
        ...slideRef.current,
        title: rewritten.title,
        content: rewritten.content,
        speakerNotes: rewritten.speakerNotes ?? speakerNotes,
      };
      slideRef.current = updated;
      onUpdate(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rewrite failed");
    } finally {
      setRewriting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">Edit slide</h3>
        {saving ? (
          <span className="text-xs text-muted-foreground">Saving…</span>
        ) : lastSaved ? (
          <span className="text-xs text-muted-foreground">Saved</span>
        ) : null}
      </div>

      <Tabs defaultValue="content">
        <TabsList className="w-full">
          <TabsTrigger value="content" className="flex-1">
            Content
          </TabsTrigger>
          <TabsTrigger value="background" className="flex-1">
            Background
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1">
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slide-title">Title</Label>
            <Input
              id="slide-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slide-layout">Layout</Label>
            <select
              id="slide-layout"
              value={layout}
              onChange={(e) =>
                handleLayoutChange(e.target.value as SlideLayout)
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SLIDE_LAYOUTS.map((l) => (
                <option key={l} value={l}>
                  {l.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Changing layout remaps your existing content into the new format.
            </p>
          </div>

          {slots.includes("body") && (
            <div className="space-y-2">
              <Label htmlFor="slide-body">
                {layout === "title" || layout === "section_break"
                  ? "Subtitle"
                  : "Body"}
              </Label>
              <textarea
                id="slide-body"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}

          {slots.includes("bullets") && (
            <div className="space-y-2">
              <Label htmlFor="slide-bullets">
                {layout === "timeline"
                  ? "Timeline items (one per line)"
                  : "Bullets (one per line)"}
              </Label>
              <textarea
                id="slide-bullets"
                rows={4}
                value={bullets}
                onChange={(e) => setBullets(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}

          {slots.includes("metrics") && (
            <div className="space-y-2">
              <Label htmlFor="slide-metrics">Metrics (Label | Value)</Label>
              <textarea
                id="slide-metrics"
                rows={4}
                value={metricsText}
                onChange={(e) => setMetricsText(e.target.value)}
                placeholder={"NPS | 72\nRevenue | $1.2M"}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}

          {slots.includes("quote") && (
            <div className="space-y-2">
              <Label htmlFor="slide-quote">Quote</Label>
              <textarea
                id="slide-quote"
                rows={3}
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          )}

          {slots.includes("attribution") && (
            <div className="space-y-2">
              <Label htmlFor="slide-attribution">Attribution</Label>
              <Input
                id="slide-attribution"
                value={attribution}
                onChange={(e) => setAttribution(e.target.value)}
                placeholder="Name or source"
              />
            </div>
          )}

          {slots.includes("chartData") && (
            <p className="text-xs text-muted-foreground">
              Chart data comes from metrics when available. Switch to metrics
              grid to edit values, or use Rewrite with AI to regenerate the
              chart.
            </p>
          )}

          <SlideVisualUpload
            slide={slideRef.current}
            deckId={deckId}
            onAnnotateImage={onAnnotateImage}
            onVisualReady={(updated) => {
              setLayout(updated.layout);
              layoutRef.current = updated.layout;
              applyContentToFields(updated.content);
              slideRef.current = updated;
              onUpdate(updated);
            }}
          />

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleRewrite}
            disabled={rewriting}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {rewriting ? "Rewriting…" : "Rewrite with AI"}
          </Button>
          <p
            className="sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {rewriting ? "Rewriting slide with AI. Please wait." : ""}
          </p>
        </TabsContent>

        <TabsContent value="background" className="space-y-4">
          <SlideBackgroundPanel
            slide={slide}
            deckId={deckId}
            slideCount={slideCount}
            onBackgroundChange={(updated) => {
              slideRef.current = updated;
              onUpdate(updated);
            }}
            onBackgroundAppliedToAll={onBackgroundAppliedToAll}
          />
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="speaker-notes">Speaker notes</Label>
            <textarea
              id="speaker-notes"
              rows={8}
              value={speakerNotes}
              onChange={(e) => setSpeakerNotes(e.target.value)}
              placeholder="Notes for the presenter — not shown on the slide."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Speaker notes appear in export and narration during playback.
          </p>
        </TabsContent>
      </Tabs>

      <Button
        onClick={() => void persistSlide()}
        disabled={saving}
        className="w-full"
      >
        {saving ? "Saving…" : "Save now"}
      </Button>
    </div>
  );
}
