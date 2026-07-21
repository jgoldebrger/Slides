export const AI_TONES = [
  "executive",
  "concise",
  "collaborative",
  "formal",
  "optimistic",
] as const;

export type AiTone = (typeof AI_TONES)[number];

export const AI_TONE_LABELS: Record<AiTone, string> = {
  executive: "Executive",
  concise: "Concise",
  collaborative: "Collaborative",
  formal: "Formal",
  optimistic: "Optimistic",
};

export const AI_TONE_DESCRIPTIONS: Record<AiTone, string> = {
  executive: "Crisp and decision-ready — lead with outcomes.",
  concise: "Short bullets, minimal filler, denser slides.",
  collaborative: "Inclusive “we” voice — progress plus clear asks.",
  formal: "Conservative corporate tone — careful risk language.",
  optimistic: "Confident progress — risks framed with mitigations.",
};

const TONE_HINTS: Record<AiTone, string> = {
  executive:
    "Use an executive voice: crisp, decision-ready, lead with outcomes and implications. Avoid fluff.",
  concise:
    "Use a concise voice: short bullets, tight phrasing, minimal filler. Prefer density over prose.",
  collaborative:
    "Use a collaborative voice: inclusive “we”, acknowledge partners, end asks clearly when relevant.",
  formal:
    "Use a formal corporate voice: polished, measured language; frame risks carefully and professionally.",
  optimistic:
    "Use an optimistic but factual voice: emphasize progress and confidence; pair risks with mitigations. Do not invent good news.",
};

export function isAiTone(value: unknown): value is AiTone {
  return typeof value === "string" && (AI_TONES as readonly string[]).includes(value);
}

export function normalizeAiTone(value: unknown): AiTone {
  return isAiTone(value) ? value : "executive";
}

/** Prompt fragment injected into outline / fill / rewrite. */
export function aiTonePromptHint(tone: AiTone = "executive"): string {
  return TONE_HINTS[normalizeAiTone(tone)];
}
