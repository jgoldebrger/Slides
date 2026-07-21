import type { Slide } from "@/types/slide";

export function buildSlideNarration(slide: Slide): string {
  const parts: string[] = [];

  if (slide.title?.trim()) parts.push(slide.title.trim());

  if (slide.content.body?.trim()) parts.push(slide.content.body.trim());

  if (slide.content.bullets?.length) {
    parts.push(slide.content.bullets.join(". "));
  }

  if (slide.content.quote?.trim()) {
    parts.push(slide.content.quote.trim());
  }

  if (slide.speakerNotes?.trim()) {
    parts.push(slide.speakerNotes.trim());
  }

  return parts.join(". ");
}

export function speakText(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    onEnd?: () => void;
    onError?: () => void;
  }
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
