import { z } from "zod";

export const SUPPORTED_TRANSLATE_LANGUAGES = [
  "es",
  "fr",
  "de",
  "pt",
  "ja",
  "zh",
] as const;

export type TranslateLanguage = (typeof SUPPORTED_TRANSLATE_LANGUAGES)[number];

export const TRANSLATE_LANGUAGE_LABELS: Record<TranslateLanguage, string> = {
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  ja: "Japanese",
  zh: "Chinese (Simplified)",
};

export const slideTranslationSchema = z.object({
  title: z.string(),
  speakerNotes: z.string(),
  content: z.record(z.string(), z.unknown()),
});
