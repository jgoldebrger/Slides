import type { Slide } from "@/types/slide";
import {
  DEFAULT_AI_TTS_VOICE,
  isAiTtsVoice,
  type AiTtsVoice,
} from "@/lib/ai/tts-voices";

export function buildSlideNarration(slide: Slide): string {
  const parts: string[] = [];

  if (slide.title?.trim()) parts.push(slide.title.trim());

  if (slide.content.body?.trim()) parts.push(slide.content.body.trim());

  if (slide.content.bullets?.length) {
    parts.push(slide.content.bullets.join(". "));
  }

  if (slide.content.metrics?.length) {
    parts.push(
      slide.content.metrics.map((m) => `${m.label}: ${m.value}`).join(". ")
    );
  }

  if (slide.content.quote?.trim()) {
    parts.push(slide.content.quote.trim());
  }

  if (slide.speakerNotes?.trim()) {
    parts.push(slide.speakerNotes.trim());
  }

  return parts.join(". ");
}

const STORAGE_KEY = "updatedeck.player.ai-narration";

export type NarrationPrefs = {
  enabled: boolean;
  voice: AiTtsVoice;
};

export const DEFAULT_NARRATION_PREFS: NarrationPrefs = {
  enabled: true,
  voice: DEFAULT_AI_TTS_VOICE,
};

export function loadNarrationPrefs(fallbackEnabled = true): NarrationPrefs {
  if (typeof window === "undefined") {
    return { ...DEFAULT_NARRATION_PREFS, enabled: fallbackEnabled };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_NARRATION_PREFS, enabled: fallbackEnabled };
    }
    const parsed = JSON.parse(raw) as Partial<NarrationPrefs> & {
      voiceURI?: string;
      pitch?: number;
    };
    return {
      enabled:
        typeof parsed.enabled === "boolean" ? parsed.enabled : fallbackEnabled,
      voice: isAiTtsVoice(parsed.voice)
        ? parsed.voice
        : DEFAULT_AI_TTS_VOICE,
    };
  } catch {
    return { ...DEFAULT_NARRATION_PREFS, enabled: fallbackEnabled };
  }
}

export function saveNarrationPrefs(prefs: NarrationPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode
  }
}

/** @deprecated Browser TTS removed — generative OpenAI voice is used instead. */
export function stopSpeaking() {
  // no-op kept for call-site compatibility during migration
}
