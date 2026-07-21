"use client";



import { useCallback, useEffect, useRef, useState } from "react";

import { Sparkles } from "lucide-react";

import { toast } from "sonner";

import { getActionError } from "@/lib/action-result";

import { rewriteSlide } from "@/lib/actions/decks";

import { updateSlide } from "@/lib/actions/slides";

import { SLIDE_LAYOUTS } from "@/types/slide";

import type { Slide, SlideLayout } from "@/types/slide";

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

};



export function SlideEditorPanel({

  slide,

  deckId,

  slideCount,

  onUpdate,

  onBackgroundAppliedToAll,

}: SlideEditorPanelProps) {

  const [title, setTitle] = useState(slide.title);

  const [layout, setLayout] = useState<SlideLayout>(slide.layout);

  const [body, setBody] = useState(slide.content.body ?? "");

  const [bullets, setBullets] = useState(

    (slide.content.bullets ?? []).join("\n")

  );

  const [speakerNotes, setSpeakerNotes] = useState(slide.speakerNotes ?? "");

  const [saving, setSaving] = useState(false);

  const [rewriting, setRewriting] = useState(false);

  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const slideRef = useRef(slide);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    slideRef.current = slide;
  }, [slide]);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const persistSlide = useCallback(async () => {
    const currentSlide = slideRef.current;
    setSaving(true);

    const payload = {
      title,
      layout,
      type: currentSlide.type,
      content: {
        ...currentSlide.content,
        body,
        bullets: bullets.split("\n").filter(Boolean),
      },
      speaker_notes: speakerNotes,
    };

    const result = await updateSlide(currentSlide.id, deckId, payload);
    const actionError = getActionError(result);

    if (actionError) {
      toast.error(actionError);
    } else {
      setLastSaved(new Date());
      onUpdateRef.current({
        ...currentSlide,
        title,
        layout,
        content: payload.content,
        speakerNotes,
      });
    }

    setSaving(false);
  }, [title, layout, body, bullets, speakerNotes, deckId]);

  useDebouncedEffect(
    () => {
      void persistSlide();
    },
    [title, layout, body, bullets, speakerNotes],
    AUTOSAVE_DEBOUNCE_MS,
    { skipFirst: true }
  );

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
      setBody(rewritten.content.body ?? "");
      setBullets((rewritten.content.bullets ?? []).join("\n"));
      if (rewritten.speakerNotes) {
        setSpeakerNotes(rewritten.speakerNotes);
      }
      onUpdate({
        ...slide,
        title: rewritten.title,
        content: rewritten.content,
        speakerNotes: rewritten.speakerNotes ?? speakerNotes,
      });
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

              onChange={(e) => setLayout(e.target.value as SlideLayout)}

              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

            >

              {SLIDE_LAYOUTS.map((l) => (

                <option key={l} value={l}>

                  {l.replace(/_/g, " ")}

                </option>

              ))}

            </select>

          </div>



          <div className="space-y-2">

            <Label htmlFor="slide-body">Body</Label>

            <textarea

              id="slide-body"

              rows={3}

              value={body}

              onChange={(e) => setBody(e.target.value)}

              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

            />

          </div>



          <div className="space-y-2">

            <Label htmlFor="slide-bullets">Bullets (one per line)</Label>

            <textarea

              id="slide-bullets"

              rows={4}

              value={bullets}

              onChange={(e) => setBullets(e.target.value)}

              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

            />

          </div>



          <SlideVisualUpload

            slide={slide}

            deckId={deckId}

            onVisualReady={(updated) => {

              setLayout(updated.layout);

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



      <Button onClick={() => void persistSlide()} disabled={saving} className="w-full">

        {saving ? "Saving…" : "Save now"}

      </Button>

    </div>

  );

}

