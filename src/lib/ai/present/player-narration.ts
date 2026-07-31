import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { buildPlayerNarrationPrompt } from "@/lib/ai/prompts/player-narration";
import { buildSlideNarration } from "@/lib/slides/narration";
import type { Slide } from "@/types/slide";

const scriptSchema = z.object({ script: z.string().min(1).max(4000) });

export async function generatePlayerSlideScript({
  slide,
  slideIndex,
  slideCount,
  deckName,
}: {
  slide: Slide;
  slideIndex: number;
  slideCount: number;
  deckName: string;
}): Promise<string> {
  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: scriptSchema,
      prompt: buildPlayerNarrationPrompt({ slide, slideIndex, slideCount, deckName }),
    });
    return object.script.trim();
  } catch {
    return buildSlideNarration(slide);
  }
}
