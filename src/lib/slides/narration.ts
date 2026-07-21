import type { Slide } from "@/types/slide";

export function buildSlideNarration(slide: Slide): string {
  const parts: string[] = [];

  if (slide.title?.trim()) parts.push(slide.title.trim());

  if (slide.content.body?.trim()) parts.push(slide.content.body.trim());

  if (slide.content.bullets?.length) {
    parts.push(slide.content.bullets.join(". "));
  }

  if (slide.content.metrics?.length) {
    parts.push(
      slide.content.metrics
        .map((m) => `${m.label}: ${m.value}`)
        .join(". ")
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

export type SpeakOptions = {
  rate?: number;
  pitch?: number;
  /** SpeechSynthesisVoice.voiceURI */
  voiceURI?: string | null;
  lang?: string;
  onEnd?: () => void;
  onError?: () => void;
};

export function listSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices();
}

/** Prefer English voices, then everything else; de-dupe by voiceURI. */
export function preferredSpeechVoices(
  voices: SpeechSynthesisVoice[] = listSpeechVoices()
): SpeechSynthesisVoice[] {
  const seen = new Set<string>();
  const unique = voices.filter((v) => {
    if (!v.voiceURI || seen.has(v.voiceURI)) return false;
    seen.add(v.voiceURI);
    return true;
  });

  const en = unique.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const rest = unique.filter((v) => !v.lang.toLowerCase().startsWith("en"));
  return [...en, ...rest];
}

export function findSpeechVoice(
  voiceURI: string | null | undefined,
  voices: SpeechSynthesisVoice[] = listSpeechVoices()
): SpeechSynthesisVoice | null {
  if (!voiceURI) return null;
  return voices.find((v) => v.voiceURI === voiceURI) ?? null;
}

export function speakText(
  text: string,
  options?: SpeakOptions
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  if (!text.trim()) {
    options?.onEnd?.();
    return null;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate ?? 1;
  utterance.pitch = options?.pitch ?? 1;
  if (options?.lang) utterance.lang = options.lang;

  const voice = findSpeechVoice(options?.voiceURI);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }

  utterance.onend = () => options?.onEnd?.();
  utterance.onerror = () => options?.onError?.();
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

const STORAGE_KEY = "updatedeck.player.narration";

export type NarrationPrefs = {
  enabled: boolean;
  voiceURI: string | null;
  pitch: number;
};

export const DEFAULT_NARRATION_PREFS: NarrationPrefs = {
  enabled: true,
  voiceURI: null,
  pitch: 1,
};

export function loadNarrationPrefs(
  fallbackEnabled = true
): NarrationPrefs {
  if (typeof window === "undefined") {
    return { ...DEFAULT_NARRATION_PREFS, enabled: fallbackEnabled };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_NARRATION_PREFS, enabled: fallbackEnabled };
    }
    const parsed = JSON.parse(raw) as Partial<NarrationPrefs>;
    return {
      enabled:
        typeof parsed.enabled === "boolean" ? parsed.enabled : fallbackEnabled,
      voiceURI:
        typeof parsed.voiceURI === "string" ? parsed.voiceURI : null,
      pitch:
        typeof parsed.pitch === "number" && parsed.pitch >= 0.5 && parsed.pitch <= 2
          ? parsed.pitch
          : 1,
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
