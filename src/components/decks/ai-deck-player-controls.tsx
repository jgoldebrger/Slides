"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  transitionPlayerPhase,
  type PlayerPhase,
} from "@/lib/ai/present/player-state";
import type { AiTtsVoice } from "@/lib/ai/tts-voices";

type SlideRef = { id: string };

type AiDeckPlayerControlsProps = {
  deckId: string;
  slides: SlideRef[];
  shareToken: string;
  voice: AiTtsVoice;
  speed: number;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  enabled: boolean;
};

export function AiDeckPlayerControls({
  deckId,
  slides,
  shareToken,
  voice,
  speed,
  currentIndex,
  onIndexChange,
  enabled,
}: AiDeckPlayerControlsProps) {
  const [phase, setPhase] = useState<PlayerPhase>("idle");
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const activeIndexRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearAudio = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    activeIndexRef.current = null;
    setLoading(false);
  }, []);

  const fetchAndPlay = useCallback(
    async (index: number) => {
      const slide = slides[index];
      if (!slide) {
        setPhase((current) =>
          transitionPlayerPhase(current, { type: "DECK_ENDED" })
        );
        return;
      }

      clearAudio();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      const response = await fetch(
        `/api/decks/${encodeURIComponent(deckId)}/player/narrate-slide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slideId: slide.id,
            slideIndex: index,
            slideCount: slides.length,
            voice,
            speed,
            shareToken,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        let message = "Could not load AI presenter narration.";
        try {
          const body = (await response.json()) as {
            error?: { message?: string };
          };
          if (body.error?.message) message = body.error.message;
        } catch {
          // Keep the generic message for non-JSON errors.
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      if (!blob.type.includes("audio") || blob.size < 64) {
        throw new Error("The AI presenter returned invalid audio.");
      }
      if (controller.signal.aborted) return;

      const url = URL.createObjectURL(blob);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      activeIndexRef.current = index;
      audio.onended = () => {
        if (audioUrlRef.current === url) {
          URL.revokeObjectURL(url);
          audioUrlRef.current = null;
        }
        activeIndexRef.current = null;
        if (index + 1 < slides.length) {
          onIndexChange(index + 1);
        } else {
          setPhase((current) =>
            transitionPlayerPhase(current, { type: "DECK_ENDED" })
          );
        }
      };
      setLoading(false);
      await audio.play();
    },
    [clearAudio, deckId, onIndexChange, shareToken, slides, speed, voice]
  );

  useEffect(() => {
    if (phase !== "narrating") return;
    const audio = audioRef.current;
    if (activeIndexRef.current === currentIndex && audio?.paused) {
      void audio.play().catch(() => {
        toast.error("Click Resume to continue the AI presenter.");
        setPhase("paused");
      });
      return;
    }
    if (activeIndexRef.current === currentIndex && audio && !audio.paused) return;

    void fetchAndPlay(currentIndex).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoading(false);
      setPhase("idle");
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not start the AI presenter."
      );
    });
  }, [currentIndex, fetchAndPlay, phase]);

  useEffect(() => clearAudio, [clearAudio]);

  function handlePlay() {
    if (phase === "complete") {
      clearAudio();
      onIndexChange(0);
      setPhase("narrating");
      return;
    }
    setPhase((current) =>
      transitionPlayerPhase(current, { type: "PLAY" })
    );
  }

  function handlePause() {
    audioRef.current?.pause();
    setPhase((current) =>
      transitionPlayerPhase(current, { type: "PAUSE" })
    );
  }

  function handleResume() {
    setPhase((current) =>
      transitionPlayerPhase(current, { type: "RESUME" })
    );
  }

  if (!enabled || slides.length === 0) return null;

  return (
    <section
      className="rounded-lg border border-link/20 bg-[var(--color-brand-50)] p-4"
      aria-label="AI presenter controls"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">AI presenter</p>
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Slide {currentIndex + 1} of {slides.length}
            {loading ? " · Preparing narration…" : ""}
          </p>
        </div>
        {phase === "idle" || phase === "complete" ? (
          <Button type="button" size="sm" onClick={handlePlay}>
            {loading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-1 h-4 w-4" />
            )}
            {phase === "complete" ? "Play again" : "Play"}
          </Button>
        ) : phase === "paused" ? (
          <Button type="button" size="sm" onClick={handleResume}>
            <Play className="mr-1 h-4 w-4" />
            Resume
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handlePause}
            disabled={phase === "answering"}
          >
            <Pause className="mr-1 h-4 w-4" />
            Pause
          </Button>
        )}
      </div>
    </section>
  );
}
