"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import type { BrandPreviewTheme } from "@/lib/brand";
import { SlidePreview } from "@/components/slides/slide-preview";
import { PlayerBackgroundSettings } from "@/components/decks/player-background-settings";
import {
  buildSlideNarration,
  loadNarrationPrefs,
  preferredSpeechVoices,
  saveNarrationPrefs,
  speakText,
  stopSpeaking,
} from "@/lib/slides/narration";
import type { Slide } from "@/types/slide";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2] as const;
const PITCH_OPTIONS = [
  { value: 0.8, label: "Low" },
  { value: 1, label: "Default" },
  { value: 1.2, label: "High" },
] as const;
const BASE_SLIDE_MS = 4000;

type SlidePlayerProps = {
  deckId: string;
  deckName: string;
  slides: Slide[];
  backgroundAudioUrl?: string | null;
  backgroundImageUrl?: string | null;
  viewerMode?: boolean;
  shareMode?: boolean;
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
  applyBranding = false,
  brandTheme = null,
}: SlidePlayerProps) {
  const sorted = [...slides].sort((a, b) => a.order - b.order);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [bgMuted, setBgMuted] = useState(false);
  const [bgVolume, setBgVolume] = useState(0.25);
  const [narrationEnabled, setNarrationEnabled] = useState(!shareMode);
  const [narrationVoiceURI, setNarrationVoiceURI] = useState<string | null>(
    null
  );
  const [narrationPitch, setNarrationPitch] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [prefsReady, setPrefsReady] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const presentationRef = useRef<HTMLDivElement | null>(null);
  const playingRef = useRef(false);
  const indexRef = useRef(0);

  useEffect(() => {
    const prefs = loadNarrationPrefs(!shareMode);
    setNarrationEnabled(prefs.enabled);
    setNarrationVoiceURI(prefs.voiceURI);
    setNarrationPitch(prefs.pitch);
    setPrefsReady(true);
  }, [shareMode]);

  useEffect(() => {
    if (!prefsReady) return;
    saveNarrationPrefs({
      enabled: narrationEnabled,
      voiceURI: narrationVoiceURI,
      pitch: narrationPitch,
    });
  }, [prefsReady, narrationEnabled, narrationVoiceURI, narrationPitch]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    function refreshVoices() {
      setVoices(preferredSpeechVoices());
    }

    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        refreshVoices
      );
    };
  }, []);

  const current = sorted[index];
  const goTo = useCallback(
    (next: number) => {
      stopSpeaking();
      const clamped = Math.max(0, Math.min(sorted.length - 1, next));
      indexRef.current = clamped;
      setIndex(clamped);
    },
    [sorted.length]
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

  const playCurrentSlide = useCallback(() => {
    if (!playingRef.current) return;

    if (!narrationEnabled) {
      const dwellMs = Math.max(1500, BASE_SLIDE_MS / playbackSpeed);
      const timer = window.setTimeout(advanceOrStop, dwellMs);
      return () => window.clearTimeout(timer);
    }

    const slide = sorted[indexRef.current];
    speakText(buildSlideNarration(slide), {
      rate: playbackSpeed,
      pitch: narrationPitch,
      voiceURI: narrationVoiceURI,
      onEnd: advanceOrStop,
      onError: () => {
        setPlaying(false);
        playingRef.current = false;
      },
    });
  }, [
    advanceOrStop,
    narrationEnabled,
    narrationPitch,
    narrationVoiceURI,
    playbackSpeed,
    sorted,
  ]);

  useEffect(() => {
    playingRef.current = playing;
    if (!playing) {
      stopSpeaking();
      audioRef.current?.pause();
      return;
    }

    audioRef.current?.play().catch(() => undefined);
    const cleanup = playCurrentSlide();
    return () => {
      cleanup?.();
      stopSpeaking();
    };
  }, [
    playing,
    index,
    narrationEnabled,
    narrationPitch,
    narrationVoiceURI,
    playbackSpeed,
    playCurrentSlide,
  ]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = bgMuted ? 0 : bgVolume;
    audio.playbackRate = playbackSpeed;
  }, [bgVolume, bgMuted, playbackSpeed]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      stopSpeaking();
      audio?.pause();
    };
  }, []);

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

  return (
    <div className="space-y-6">
      {!isFullscreen && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {shareMode ? (
              <p className="text-sm text-muted-foreground">Shared presentation</p>
            ) : (
              <Link
                href={viewerMode ? "/decks" : `/decks/${deckId}/editor`}
                className="rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {viewerMode ? "← Back to presentations" : "← Back to editor"}
              </Link>
            )}
            <h1 className="mt-2 text-xl font-semibold tracking-tight">{deckName}</h1>
            <p className="text-sm text-muted-foreground">
              {shareMode
                ? "View-only link"
                : viewerMode
                  ? "Presentation"
                  : "Slide player with narration"}
            </p>
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
        <audio ref={audioRef} src={backgroundAudioUrl} loop preload="auto" />
      )}

      <div
        ref={presentationRef}
        className={cn(
          "flex flex-col",
          isFullscreen &&
            "fixed inset-0 z-50 bg-foreground p-4 sm:p-8"
        )}
      >
        {isFullscreen && (
          <div className="mb-4 flex shrink-0 items-center justify-between text-background">
            <p className="truncate text-sm font-medium">{deckName}</p>
            <p className="text-sm text-background/90">
              Slide {index + 1} of {sorted.length}
            </p>
          </div>
        )}

        <div
          className={cn(
            "relative flex flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-none",
            isFullscreen && "border-background/20"
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
            <div
              className={cn(
                "absolute inset-0 bg-card/85",
                isFullscreen && "bg-card/90"
              )}
              aria-hidden
            />
          )}
          <div
            className={cn(
              "relative flex flex-1 items-center justify-center p-4 sm:p-6",
              isFullscreen && "min-h-0"
            )}
          >
            {current ? (
              <SlidePreview
                key={current.id}
                slide={current}
                applyBranding={applyBranding}
                brandTheme={brandTheme}
                className={cn(
                  "mx-auto w-full max-w-4xl",
                  isFullscreen && "max-h-full max-w-5xl"
                )}
              />
            ) : (
              <p className="py-20 text-center text-muted-foreground">
                {shareMode
                  ? "This presentation has no slides yet."
                  : "No slides yet. Add a slide or generate from the outline."}
              </p>
            )}
          </div>

          <div
            className={cn(
              "border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6",
              isFullscreen && "border-background/20 bg-foreground/95"
            )}
          >
            <div className="mb-3">
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
                className="h-6 w-full cursor-pointer accent-primary"
                aria-valuetext={
                  sorted.length
                    ? `Slide ${index + 1} of ${sorted.length}`
                    : "No slides"
                }
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setPlaying(false);
                  goTo(index - 1);
                }}
                disabled={index === 0}
                aria-label="Previous slide"
                className={cn(isFullscreen && "border-background/30 bg-background/10 text-background hover:bg-background/20")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={togglePlay}
                className={cn(
                  "gap-2 px-6",
                  isFullscreen && "bg-background text-foreground hover:bg-background/90"
                )}
              >
                {playing ? (
                  <>
                    <Pause className="h-4 w-4" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Play
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setPlaying(false);
                  goTo(index + 1);
                }}
                disabled={index >= sorted.length - 1}
                aria-label="Next slide"
                className={cn(isFullscreen && "border-background/30 bg-background/10 text-background hover:bg-background/20")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <span
                className={cn(
                  "min-w-[4rem] text-center text-sm text-muted-foreground",
                  isFullscreen && "text-background/90"
                )}
              >
                {sorted.length ? index + 1 : 0} / {sorted.length}
              </span>

              <label
                className={cn(
                  "flex items-center gap-2 text-sm",
                  isFullscreen && "text-background/90"
                )}
              >
                <span className="hidden sm:inline">Speed</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className={cn(
                    "h-9 rounded-md border border-input bg-background px-2 text-sm",
                    isFullscreen &&
                      "border-background/30 bg-background/10 text-background"
                  )}
                  aria-label="Playback speed"
                >
                  {SPEED_OPTIONS.map((speed) => (
                    <option key={speed} value={speed}>
                      {speed}x
                    </option>
                  ))}
                </select>
              </label>

              <label
                className={cn(
                  "flex items-center gap-2 text-sm",
                  isFullscreen && "text-background/90"
                )}
              >
                <input
                  type="checkbox"
                  checked={narrationEnabled}
                  onChange={(e) => {
                    setNarrationEnabled(e.target.checked);
                    if (!e.target.checked) stopSpeaking();
                  }}
                />
                AI reader
              </label>

              {narrationEnabled && (
                <>
                  <label
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      isFullscreen && "text-background/90"
                    )}
                  >
                    <span className="hidden sm:inline">Voice</span>
                    <select
                      value={narrationVoiceURI ?? ""}
                      onChange={(e) => {
                        const next = e.target.value || null;
                        setNarrationVoiceURI(next);
                        if (playing) stopSpeaking();
                      }}
                      className={cn(
                        "h-9 max-w-[10rem] rounded-md border border-input bg-background px-2 text-sm sm:max-w-[14rem]",
                        isFullscreen &&
                          "border-background/30 bg-background/10 text-background"
                      )}
                      aria-label="Narration voice"
                    >
                      <option value="">Browser default</option>
                      {voices.map((voice) => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                          {voice.name}
                          {voice.lang ? ` (${voice.lang})` : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label
                    className={cn(
                      "flex items-center gap-2 text-sm",
                      isFullscreen && "text-background/90"
                    )}
                  >
                    <span className="hidden sm:inline">Pitch</span>
                    <select
                      value={narrationPitch}
                      onChange={(e) => {
                        setNarrationPitch(Number(e.target.value));
                        if (playing) stopSpeaking();
                      }}
                      className={cn(
                        "h-9 rounded-md border border-input bg-background px-2 text-sm",
                        isFullscreen &&
                          "border-background/30 bg-background/10 text-background"
                      )}
                      aria-label="Narration pitch"
                    >
                      {PITCH_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              {backgroundAudioUrl && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setBgMuted((m) => !m)}
                    aria-label={
                      bgMuted ? "Unmute background" : "Mute background"
                    }
                    className={cn(
                      isFullscreen && "text-background hover:bg-background/10"
                    )}
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
                    className="w-20 sm:w-24"
                    aria-label="Background volume"
                  />
                </>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={() => void toggleFullscreen()}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className={cn(
                  isFullscreen && "border-background/30 bg-background/10 text-background hover:bg-background/20"
                )}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p
              className={cn(
                "mt-2 hidden text-center text-xs text-muted-foreground sm:block",
                isFullscreen && "text-background/90"
              )}
            >
              Shortcuts: ← → navigate · Space play/pause · F fullscreen · Home/End
              first/last
            </p>
          </div>
        </div>
      </div>

      {!isFullscreen && current && narrationEnabled && (
        <div
          className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground"
          aria-live="polite"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Now reading
          </p>
          <p className="mt-1 line-clamp-3">{buildSlideNarration(current)}</p>
        </div>
      )}

      {!isFullscreen && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Slides</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
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
                  "min-w-[140px] shrink-0 rounded-lg border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  i === index
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-muted-foreground/40"
                )}
              >
                <span className="text-xs opacity-80">Slide {i + 1}</span>
                <p className="mt-1 line-clamp-2 text-sm font-medium">
                  {slide.title || "Untitled"}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
