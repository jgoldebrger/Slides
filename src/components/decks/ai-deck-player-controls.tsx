"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Pause, Play, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  transitionPlayerPhase,
  type PlayerPhase,
} from "@/lib/ai/present/player-state";
import type { AiTtsVoice } from "@/lib/ai/tts-voices";

type SlideRef = { id: string };

type PlayerQaResult =
  | {
      type: "answered";
      spokenReply: string;
      citations: Array<{ field: string; excerpt: string }>;
    }
  | { type: "deferred"; spokenReply: string };

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
  const [question, setQuestion] = useState("");
  const [viewerEmail, setViewerEmail] = useState("");
  const [asking, setAsking] = useState(false);
  const [qaResult, setQaResult] = useState<PlayerQaResult | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const answerAudioRef = useRef<HTMLAudioElement | null>(null);
  const answerAudioUrlRef = useRef<string | null>(null);
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

  useEffect(() => {
    return () => {
      answerAudioRef.current?.pause();
      if (answerAudioUrlRef.current) {
        URL.revokeObjectURL(answerAudioUrlRef.current);
      }
    };
  }, []);

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

  async function handleQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || asking) return;

    audioRef.current?.pause();
    abortRef.current?.abort();
    setLoading(false);
    setAsking(true);
    setQaResult(null);
    setPhase((current) =>
      transitionPlayerPhase(current, { type: "QUESTION_ASKED" })
    );

    try {
      const askResponse = await fetch(
        `/api/decks/${encodeURIComponent(deckId)}/player/ask`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: trimmedQuestion,
            shareToken,
            ...(viewerEmail.trim()
              ? { viewerEmail: viewerEmail.trim() }
              : {}),
          }),
        }
      );

      if (!askResponse.ok) {
        let message = "The AI presenter could not answer right now.";
        try {
          const body = (await askResponse.json()) as {
            error?: { message?: string };
          };
          if (body.error?.message) message = body.error.message;
        } catch {
          // Keep the generic message for non-JSON errors.
        }
        throw new Error(message);
      }

      const result = (await askResponse.json()) as PlayerQaResult;
      if (
        (result.type !== "answered" && result.type !== "deferred") ||
        typeof result.spokenReply !== "string" ||
        (result.type === "answered" && !Array.isArray(result.citations))
      ) {
        throw new Error("The AI presenter returned an invalid answer.");
      }
      setQaResult(result);
      setQuestion("");

      const speakResponse = await fetch(
        `/api/decks/${encodeURIComponent(deckId)}/player/speak`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: result.spokenReply,
            voice,
            speed,
            shareToken,
          }),
        }
      );
      if (!speakResponse.ok) {
        throw new Error("The answer is ready, but its audio could not be played.");
      }

      const answerBlob = await speakResponse.blob();
      if (!answerBlob.type.includes("audio") || answerBlob.size < 64) {
        throw new Error("The answer audio was invalid.");
      }

      answerAudioRef.current?.pause();
      if (answerAudioUrlRef.current) {
        URL.revokeObjectURL(answerAudioUrlRef.current);
      }
      const answerUrl = URL.createObjectURL(answerBlob);
      answerAudioUrlRef.current = answerUrl;
      const answerAudio = new Audio(answerUrl);
      answerAudioRef.current = answerAudio;
      await new Promise<void>((resolve, reject) => {
        answerAudio.onended = () => resolve();
        answerAudio.onerror = () => reject(new Error("Could not play answer audio."));
        void answerAudio.play().catch(reject);
      });
      URL.revokeObjectURL(answerUrl);
      answerAudioUrlRef.current = null;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The AI presenter could not answer right now."
      );
    } finally {
      setAsking(false);
      setPhase((current) =>
        transitionPlayerPhase(current, { type: "ANSWER_DONE" })
      );
    }
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

      <div className="my-4 h-px bg-border" aria-hidden />

      <form className="space-y-3" onSubmit={handleQuestionSubmit}>
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle className="h-4 w-4 text-link" />
            Ask about this presentation
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Answers use only the slides and linked project update.
          </p>
        </div>
        <Textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What would you like to know?"
          maxLength={500}
          disabled={asking || phase === "idle" || phase === "complete"}
          aria-label="Question for the AI presenter"
          required
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            value={viewerEmail}
            onChange={(event) => setViewerEmail(event.target.value)}
            placeholder="Email for follow-up (optional)"
            maxLength={320}
            disabled={asking || phase === "idle" || phase === "complete"}
            aria-label="Email for question follow-up"
          />
          <Button
            type="submit"
            size="sm"
            disabled={
              asking ||
              !question.trim() ||
              phase === "idle" ||
              phase === "complete"
            }
          >
            {asking ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-1 h-4 w-4" />
            )}
            {asking ? "Answering…" : "Ask"}
          </Button>
        </div>
        {phase === "idle" || phase === "complete" ? (
          <p className="text-xs text-muted-foreground">
            Start the AI presenter to ask a question.
          </p>
        ) : null}
      </form>

      {qaResult ? (
        <div
          className={
            qaResult.type === "deferred"
              ? "mt-4 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm"
              : "mt-4 rounded-md border border-link/20 bg-background p-3 text-sm"
          }
          aria-live="polite"
        >
          <p className="font-medium">
            {qaResult.type === "deferred" ? "Question deferred" : "AI answer"}
          </p>
          <p className="mt-1 text-muted-foreground">{qaResult.spokenReply}</p>
          {qaResult.type === "answered" && qaResult.citations.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sources
              </p>
              <ul className="mt-1 space-y-1">
                {qaResult.citations.map((citation, index) => (
                  <li key={`${citation.field}-${index}`} className="text-xs">
                    <span className="font-medium">{citation.field}:</span>{" "}
                    {citation.excerpt}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
