"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import type { BrandPreviewTheme } from "@/lib/brand";
import { SlidePreview } from "@/components/slides/slide-preview";
import { PlayerBackgroundSettings } from "@/components/decks/player-background-settings";
import {
  AI_TTS_VOICE_LABELS,
  AI_TTS_VOICES,
  DEFAULT_AI_TTS_VOICE,
  type AiTtsVoice,
} from "@/lib/ai/tts-voices";
import {
  buildSlideNarration,
  loadNarrationPrefs,
  saveNarrationPrefs,
} from "@/lib/slides/narration";
import type { Slide } from "@/types/slide";
import { Button } from "@/components/ui/button";
import { AiPresentPanel } from "@/components/decks/ai-present-panel";
import { cn } from "@/lib/utils";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2] as const;
const BASE_SLIDE_MS = 4000;

type SlidePlayerProps = {
  deckId: string;
  deckName: string;
  slides: Slide[];
  backgroundAudioUrl?: string | null;
  backgroundImageUrl?: string | null;
  viewerMode?: boolean;
  shareMode?: boolean;
  /** Required for AI narration on public share links */
  shareToken?: string | null;
  applyBranding?: boolean;
  brandTheme?: BrandPreviewTheme | null;
};

export function SlidePlayer({
  deckId,
  deckName,
  slides,
  backgroundAudioUrl,
  backgroundImageUrl,
  viewerMode = false,
  shareMode = false,
  shareToken = null,
  applyBranding = false,
  brandTheme = null,
}: SlidePlayerProps) {
  const sorted = useMemo(
    () => [...slides].sort((a, b) => a.order - b.order),
    [slides]
  );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [bgMuted, setBgMuted] = useState(false);
  const [bgVolume, setBgVolume] = useState(0.25);
  const [narrationEnabled, setNarrationEnabled] = useState(!shareMode);
  const [narrationVoice, setNarrationVoice] =
    useState<AiTtsVoice>(DEFAULT_AI_TTS_VOICE);
  const [narrationLoading, setNarrationLoading] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const narrationAudioRef = useRef<HTMLAudioElement | null>(null);
  const narrationObjectUrlRef = useRef<string | null>(null);
  const narrateAbortRef = useRef<AbortController | null>(null);
  const narrationCacheRef = useRef<Map<string, Blob>>(new Map());
  const narrationInflightRef = useRef<Map<string, Promise<Blob>>>(new Map());
  const presentationRef = useRef<HTMLDivElement | null>(null);
  const playingRef = useRef(false);
  const indexRef = useRef(0);

  const narrationCacheKey = useCallback(
    (slideId: string) => `${slideId}:${narrationVoice}:${playbackSpeed}`,
    [narrationVoice, playbackSpeed]
  );

  const fetchNarrationBlob = useCallback(
    async (slideId: string, signal?: AbortSignal): Promise<Blob> => {
      const key = narrationCacheKey(slideId);
      const cached = narrationCacheRef.current.get(key);
      if (cached) return cached;

      const inflight = narrationInflightRef.current.get(key);
      if (inflight) {
        const blob = await inflight;
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        return blob;
      }

      const promise = (async () => {
        const res = await fetch(`/api/decks/${deckId}/narrate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slideId,
            voice: narrationVoice,
            speed: playbackSpeed,
            ...(shareToken ? { shareToken } : {}),
          }),
          signal,
        });

        if (!res.ok) {
          let message = "Could not generate AI voice";
          try {
            const body = (await res.json()) as {
              error?: { message?: string };
            };
            if (body.error?.message) message = body.error.message;
          } catch {
            // ignore
          }
          throw new Error(message);
        }

        const blob = await res.blob();
        narrationCacheRef.current.set(key, blob);
        return blob;
      })();

      narrationInflightRef.current.set(key, promise);
      try {
        return await promise;
      } finally {
        narrationInflightRef.current.delete(key);
      }
    },
    [deckId, narrationCacheKey, narrationVoice, playbackSpeed, shareToken]
  );

  const prefetchNarration = useCallback(
    (slideIndex: number) => {
      if (!narrationEnabled) return;
      const slide = sorted[slideIndex];
      if (!slide) return;
      const key = narrationCacheKey(slide.id);
      if (
        narrationCacheRef.current.has(key) ||
        narrationInflightRef.current.has(key)
      ) {
        return;
      }
      void fetchNarrationBlob(slide.id).catch(() => undefined);
    },
    [fetchNarrationBlob, narrationCacheKey, narrationEnabled, sorted]
  );

  const stopNarrationAudio = useCallback(() => {
    narrateAbortRef.current?.abort();
    narrateAbortRef.current = null;
    const audio = narrationAudioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute("src");
    }
    if (narrationObjectUrlRef.current) {
      URL.revokeObjectURL(narrationObjectUrlRef.current);
      narrationObjectUrlRef.current = null;
    }
    setNarrationLoading(false);
  }, []);

  useEffect(() => {
    const prefs = loadNarrationPrefs(!shareMode);
    setNarrationEnabled(prefs.enabled);
    setNarrationVoice(prefs.voice);
    setPrefsReady(true);
  }, [shareMode]);

  useEffect(() => {
    narrationCacheRef.current.clear();
    narrationInflightRef.current.clear();
  }, [narrationVoice, playbackSpeed]);

  useEffect(() => {
    if (!prefsReady || !narrationEnabled || sorted.length === 0) return;
    prefetchNarration(index);
    prefetchNarration(index + 1);
  }, [prefsReady, narrationEnabled, sorted.length, index, prefetchNarration]);

  useEffect(() => {
    if (!prefsReady) return;
    saveNarrationPrefs({
      enabled: narrationEnabled,
      voice: narrationVoice,
    });
  }, [prefsReady, narrationEnabled, narrationVoice]);

  const goTo = useCallback(
    (next: number) => {
      stopNarrationAudio();
      const clamped = Math.max(0, Math.min(sorted.length - 1, next));
      indexRef.current = clamped;
      setIndex(clamped);
    },
    [sorted.length, stopNarrationAudio]
  );

  const advanceOrStop = useCallback(() => {
    if (!playingRef.current) return;
    if (indexRef.current < sorted.length - 1) {
      goTo(indexRef.current + 1);
    } else {
      setPlaying(false);
      playingRef.current = false;
    }
  }, [goTo, sorted.length]);

  const playNarrationBlob = useCallback(
    async (blob: Blob, abort: AbortSignal) => {
      if (abort.aborted || !playingRef.current) return;

      if (narrationObjectUrlRef.current) {
        URL.revokeObjectURL(narrationObjectUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      narrationObjectUrlRef.current = url;

      const audio = narrationAudioRef.current;
      if (!audio) {
        setNarrationLoading(false);
        toast.error("Audio player is not ready. Try play again.");
        setPlaying(false);
        playingRef.current = false;
        return;
      }

      audio.src = url;
      audio.playbackRate = 1;
      audio.onended = () => advanceOrStop();
      audio.onerror = () => {
        toast.error("AI voice playback failed");
        setPlaying(false);
        playingRef.current = false;
      };
      setNarrationLoading(false);
      try {
        await audio.play();
        prefetchNarration(indexRef.current + 1);
      } catch {
        toast.error("Could not play audio. Click play again.");
        setPlaying(false);
        playingRef.current = false;
      }
    },
    [advanceOrStop, prefetchNarration]
  );

  const playCurrentSlide = useCallback(() => {
    if (!playingRef.current) return () => undefined;

    if (!narrationEnabled) {
      const dwellMs = Math.max(1500, BASE_SLIDE_MS / playbackSpeed);
      const timer = window.setTimeout(advanceOrStop, dwellMs);
      return () => window.clearTimeout(timer);
    }

    const slide = sorted[indexRef.current];
    if (!slide) {
      advanceOrStop();
      return () => undefined;
    }

    const abort = new AbortController();
    narrateAbortRef.current = abort;
    const cacheKey = narrationCacheKey(slide.id);
    const cached = narrationCacheRef.current.get(cacheKey);
    setNarrationLoading(!cached);

    void (async () => {
      try {
        const blob = cached ?? (await fetchNarrationBlob(slide.id, abort.signal));
        await playNarrationBlob(blob, abort.signal);
        prefetchNarration(indexRef.current + 2);
      } catch (err) {
        if (abort.signal.aborted) return;
        setNarrationLoading(false);
        toast.error(
          err instanceof Error ? err.message : "Could not generate AI voice"
        );
        setPlaying(false);
        playingRef.current = false;
      }
    })();

    return () => {
      abort.abort();
      stopNarrationAudio();
    };
  }, [
    advanceOrStop,
    fetchNarrationBlob,
    narrationCacheKey,
    narrationEnabled,
    playbackSpeed,
    playNarrationBlob,
    prefetchNarration,
    sorted,
    stopNarrationAudio,
  ]);

  const current = sorted[index];

  useEffect(() => {
    playingRef.current = playing;
    if (!playing) {
      stopNarrationAudio();
      bgAudioRef.current?.pause();
      return;
    }

    bgAudioRef.current?.play().catch(() => undefined);
    const cleanup = playCurrentSlide();
    return () => {
      cleanup?.();
    };
  }, [
    playing,
    index,
    narrationEnabled,
    narrationVoice,
    playbackSpeed,
    playCurrentSlide,
    stopNarrationAudio,
  ]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    audio.volume = bgMuted ? 0 : bgVolume;
  }, [bgVolume, bgMuted]);

  useEffect(() => {
    return () => {
      stopNarrationAudio();
      bgAudioRef.current?.pause();
    };
  }, [stopNarrationAudio]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === presentationRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const el = presentationRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by the browser.
    }
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
        case "PageUp":
          e.preventDefault();
          setPlaying(false);
          goTo(indexRef.current - 1);
          break;
        case "ArrowRight":
        case "PageDown":
        case " ":
          e.preventDefault();
          if (e.key === " ") {
            togglePlay();
          } else {
            setPlaying(false);
            goTo(indexRef.current + 1);
          }
          break;
        case "Home":
          e.preventDefault();
          setPlaying(false);
          goTo(0);
          break;
        case "End":
          e.preventDefault();
          setPlaying(false);
          goTo(sorted.length - 1);
          break;
        case "f":
        case "F":
          e.preventDefault();
          void toggleFullscreen();
          break;
        case "Escape":
          if (document.fullscreenElement) {
            void document.exitFullscreen();
          }
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, sorted.length, toggleFullscreen, togglePlay]);

  const progressPercent =
    sorted.length > 1 ? (index / (sorted.length - 1)) * 100 : 0;

  const controlButtonClass = cn(
    "text-background/90 hover:bg-background/10 hover:text-background",
    isFullscreen && "text-background/90 hover:bg-background/10"
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {!isFullscreen && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {shareMode ? (
              <p className="text-sm text-muted-foreground">Shared presentation</p>
            ) : (
              <Link
                href={viewerMode ? "/decks" : `/decks/${deckId}/editor`}
                className="rounded-sm text-sm text-link/80 hover:text-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {viewerMode ? "← Back to presentations" : "← Back to editor"}
              </Link>
            )}
            <h1 className="mt-1 truncate text-lg font-semibold tracking-tight">
              {deckName}
            </h1>
          </div>
          {!viewerMode && !shareMode && (
            <PlayerBackgroundSettings
              deckId={deckId}
              backgroundAudioUrl={backgroundAudioUrl}
              backgroundImageUrl={backgroundImageUrl}
            />
          )}
        </div>
      )}

      {backgroundAudioUrl && (
        <audio ref={bgAudioRef} src={backgroundAudioUrl} loop preload="auto" />
      )}
      <audio ref={narrationAudioRef} preload="auto" className="hidden" />

      <div
        ref={presentationRef}
        className={cn(
          "overflow-hidden rounded-xl border border-border shadow-lg",
          isFullscreen && "fixed inset-0 z-50 flex flex-col rounded-none border-0 bg-foreground p-4 sm:p-6"
        )}
      >
        {isFullscreen && (
          <div className="mb-3 flex shrink-0 items-center justify-between text-background">
            <p className="truncate text-sm font-medium">{deckName}</p>
            <p className="text-sm text-background/80">
              {index + 1} / {sorted.length}
              {narrationLoading ? " · Generating voice…" : ""}
            </p>
          </div>
        )}

        <div
          className={cn(
            "bg-foreground",
            isFullscreen ? "flex min-h-0 flex-1 flex-col" : ""
          )}
        >
          <div
            className={cn(
              "relative aspect-video w-full bg-black",
              isFullscreen && "min-h-0 flex-1"
            )}
            style={
              backgroundImageUrl
                ? {
                    backgroundImage: `url(${backgroundImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            {backgroundImageUrl && (
              <div className="absolute inset-0 bg-black/55" aria-hidden />
            )}
            <div className="relative flex h-full items-center justify-center p-4 sm:p-8">
              {current ? (
                <SlidePreview
                  key={current.id}
                  slide={current}
                  applyBranding={applyBranding}
                  brandTheme={brandTheme}
                  className={cn(
                    "mx-auto w-full max-w-4xl shadow-2xl",
                    isFullscreen && "max-h-full"
                  )}
                />
              ) : (
                <p className="text-center text-sm text-background/70">
                  {shareMode
                    ? "This presentation has no slides yet."
                    : "No slides yet. Add a slide or generate from the outline."}
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-background/10 bg-foreground px-3 py-3 sm:px-4">
            <div className="mb-3 px-1">
              <label className="sr-only" htmlFor="presentation-progress">
                Presentation progress
              </label>
              <input
                id="presentation-progress"
                type="range"
                min={0}
                max={Math.max(sorted.length - 1, 0)}
                step={1}
                value={index}
                disabled={sorted.length === 0}
                onChange={(e) => {
                  setPlaying(false);
                  goTo(Number(e.target.value));
                }}
                style={{
                  background: `linear-gradient(to right, var(--link) ${progressPercent}%, color-mix(in oklch, var(--background) 25%, transparent) ${progressPercent}%)`,
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-link [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-background [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-background"
                aria-valuetext={
                  sorted.length
                    ? `Slide ${index + 1} of ${sorted.length}`
                    : "No slides"
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setPlaying(false);
                    goTo(index - 1);
                  }}
                  disabled={index === 0}
                  aria-label="Previous slide"
                  className={controlButtonClass}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  onClick={togglePlay}
                  size="icon"
                  aria-label={playing ? "Pause" : "Play"}
                  className="h-11 w-11 rounded-full bg-link text-primary-foreground hover:bg-link/90"
                >
                  {playing ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5 translate-x-0.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setPlaying(false);
                    goTo(index + 1);
                  }}
                  disabled={index >= sorted.length - 1}
                  aria-label="Next slide"
                  className={controlButtonClass}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <span className="min-w-[3.5rem] text-sm tabular-nums text-background/80">
                {sorted.length ? index + 1 : 0}/{sorted.length}
              </span>

              <div className="hidden h-5 w-px bg-background/20 sm:block" aria-hidden />

              <label className="flex items-center gap-2 text-sm text-background/80">
                <span className="hidden md:inline">Speed</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="h-8 rounded-md border border-background/20 bg-background/10 px-2 text-sm text-background"
                  aria-label="Playback speed"
                >
                  {SPEED_OPTIONS.map((speed) => (
                    <option key={speed} value={speed} className="text-foreground">
                      {speed}x
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm text-background/80">
                <input
                  type="checkbox"
                  checked={narrationEnabled}
                  onChange={(e) => {
                    setNarrationEnabled(e.target.checked);
                    if (!e.target.checked) stopNarrationAudio();
                  }}
                  className="accent-link"
                />
                AI reader
              </label>

              {narrationEnabled ? (
                <label className="flex items-center gap-2 text-sm text-background/80">
                  <span className="hidden lg:inline">Voice</span>
                  <select
                    value={narrationVoice}
                    onChange={(e) => {
                      setNarrationVoice(e.target.value as AiTtsVoice);
                      if (playing) stopNarrationAudio();
                    }}
                    className="h-8 max-w-[10rem] rounded-md border border-background/20 bg-background/10 px-2 text-sm text-background lg:max-w-[12rem]"
                    aria-label="AI narration voice"
                  >
                    {AI_TTS_VOICES.map((voice) => (
                      <option key={voice} value={voice} className="text-foreground">
                        {AI_TTS_VOICE_LABELS[voice]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {narrationLoading ? (
                <span className="text-xs text-background/70" aria-live="polite">
                  Generating voice…
                </span>
              ) : null}

              {backgroundAudioUrl ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setBgMuted((m) => !m)}
                    aria-label={bgMuted ? "Unmute background" : "Mute background"}
                    className={controlButtonClass}
                  >
                    {bgMuted ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={bgVolume}
                    onChange={(e) => setBgVolume(Number(e.target.value))}
                    className="w-16 accent-link sm:w-20"
                    aria-label="Background volume"
                  />
                </div>
              ) : null}

              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void toggleFullscreen()}
                  aria-label={
                    isFullscreen ? "Exit fullscreen" : "Enter fullscreen"
                  }
                  className={controlButtonClass}
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!isFullscreen && current && narrationEnabled && (
        <div
          className="rounded-lg border border-link/20 bg-[var(--color-brand-100)]/50 px-4 py-3 text-sm"
          aria-live="polite"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-link/70">
            Now reading
          </p>
          <p className="mt-1 line-clamp-2 text-foreground">
            {buildSlideNarration(current)}
          </p>
        </div>
      )}

      {!isFullscreen && sorted.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Slides
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sorted.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => {
                  setPlaying(false);
                  goTo(i);
                }}
                aria-current={i === index ? "true" : undefined}
                aria-label={`Go to slide ${i + 1}: ${slide.title || "Untitled"}`}
                className={cn(
                  "min-w-[120px] shrink-0 rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  i === index
                    ? "border-link bg-link text-primary-foreground"
                    : "border-link/20 bg-[var(--color-brand-50)] hover:border-link/40"
                )}
              >
                <span className="text-[11px] opacity-80">{i + 1}</span>
                <p className="mt-0.5 line-clamp-2 text-sm font-medium">
                  {slide.title || "Untitled"}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {!isFullscreen && !shareMode && (
        <AiPresentPanel deckId={deckId} slideIndex={index} />
      )}
    </div>
  );
}
