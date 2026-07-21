import type { TranslateLanguage } from "@/lib/ai/schemas/translate";
import { TRANSLATE_LANGUAGE_LABELS } from "@/lib/ai/schemas/translate";

export function buildTranslateSlidePrompt({
  language,
  title,
  content,
  speakerNotes,
}: {
  language: TranslateLanguage;
  title: string;
  content: Record<string, unknown>;
  speakerNotes: string;
}) {
  const label = TRANSLATE_LANGUAGE_LABELS[language];
  return `Translate this presentation slide to ${label}.

Rules:
- Preserve JSON structure and keys in content exactly — only translate human-readable string values.
- Keep numbers, dates, and proper nouns when appropriate.
- Do not add or remove bullets or fields.
- speakerNotes should sound natural for a presenter in ${label}.

Title: ${title}
Speaker notes: ${speakerNotes}
Content JSON:
${JSON.stringify(content, null, 2)}`;
}
