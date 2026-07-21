export const AI_TTS_VOICES = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
] as const;

export type AiTtsVoice = (typeof AI_TTS_VOICES)[number];

export const AI_TTS_VOICE_LABELS: Record<AiTtsVoice, string> = {
  alloy: "Alloy (neutral)",
  echo: "Echo (warm)",
  fable: "Fable (expressive)",
  onyx: "Onyx (deep)",
  nova: "Nova (bright)",
  shimmer: "Shimmer (clear)",
};

export const DEFAULT_AI_TTS_VOICE: AiTtsVoice = "nova";

/** OpenAI TTS input limit */
export const AI_TTS_MAX_CHARS = 4096;

export function isAiTtsVoice(value: unknown): value is AiTtsVoice {
  return (
    typeof value === "string" &&
    (AI_TTS_VOICES as readonly string[]).includes(value)
  );
}

export function normalizeAiTtsVoice(value: unknown): AiTtsVoice {
  return isAiTtsVoice(value) ? value : DEFAULT_AI_TTS_VOICE;
}

export function clampTtsSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 1;
  return Math.min(4, Math.max(0.25, speed));
}

export function truncateForTts(text: string, max = AI_TTS_MAX_CHARS): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}
