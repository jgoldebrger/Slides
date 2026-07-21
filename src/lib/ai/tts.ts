import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  clampTtsSpeed,
  normalizeAiTtsVoice,
  truncateForTts,
  type AiTtsVoice,
} from "@/lib/ai/tts-voices";

export function ttsCacheKey({
  orgId,
  deckId,
  voice,
  speed,
  text,
}: {
  orgId: string;
  deckId: string;
  voice: AiTtsVoice;
  speed: number;
  text: string;
}) {
  const hash = createHash("sha256")
    .update(`${voice}:${clampTtsSpeed(speed).toFixed(2)}:${text}`)
    .digest("hex")
    .slice(0, 32);
  return `${orgId}/${deckId}/tts/${hash}.mp3`;
}

/**
 * Generate speech with OpenAI TTS (fixed OpenAI HTTPS endpoint — no user URLs).
 */
export async function generateSpeechMp3({
  text,
  voice,
  speed = 1,
}: {
  text: string;
  voice: AiTtsVoice;
  speed?: number;
}): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const input = truncateForTts(text);
  if (!input) throw new Error("Nothing to narrate");

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: normalizeAiTtsVoice(voice),
      input,
      speed: clampTtsSpeed(speed),
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    let message = `Speech generation failed (${response.status})`;
    try {
      const err = (await response.json()) as { error?: { message?: string } };
      if (err.error?.message) message = err.error.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function getOrCreateNarrationMp3({
  supabase,
  orgId,
  deckId,
  text,
  voice,
  speed,
}: {
  supabase: SupabaseClient;
  orgId: string;
  deckId: string;
  text: string;
  voice: AiTtsVoice;
  speed: number;
}): Promise<Buffer> {
  const path = ttsCacheKey({
    orgId,
    deckId,
    voice: normalizeAiTtsVoice(voice),
    speed,
    text: truncateForTts(text),
  });

  const existing = await supabase.storage.from("slide-assets").download(path);
  if (!existing.error && existing.data) {
    return Buffer.from(await existing.data.arrayBuffer());
  }

  const mp3 = await generateSpeechMp3({ text, voice, speed });

  await supabase.storage.from("slide-assets").upload(path, mp3, {
    contentType: "audio/mpeg",
    upsert: true,
  });

  return mp3;
}
