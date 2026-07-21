import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  buildBackgroundMetaPrompt,
  buildRefineVisualMetaPrompt,
  buildVisualPromptMetaPrompt,
} from "@/lib/ai/prompts/visuals";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;

export type VisualStyle =
  | "illustration"
  | "photo"
  | "diagram"
  | "chart"
  | "abstract";

export const VISUAL_STYLES: { id: VisualStyle; label: string }[] = [
  { id: "illustration", label: "Illustration" },
  { id: "photo", label: "Photo" },
  { id: "diagram", label: "Diagram" },
  { id: "chart", label: "Chart / data viz" },
  { id: "abstract", label: "Abstract" },
];

export type BackgroundStyle =
  | "gradient"
  | "geometric"
  | "mesh"
  | "organic"
  | "minimal"
  | "dark"
  | "warm";

export const BACKGROUND_STYLES: { id: BackgroundStyle; label: string }[] = [
  { id: "gradient", label: "Soft gradient" },
  { id: "geometric", label: "Geometric" },
  { id: "mesh", label: "Mesh / aurora" },
  { id: "organic", label: "Organic watercolor" },
  { id: "minimal", label: "Minimal texture" },
  { id: "dark", label: "Dark executive" },
  { id: "warm", label: "Warm tones" },
];

const BACKGROUND_VARIATION_MODIFIERS = [
  "ethereal morning atmosphere",
  "cool mist and soft shadows",
  "luminous edge highlights",
  "muted desaturated palette",
  "gentle radial focal glow",
  "horizontal band of light",
  "scattered bokeh hints",
  "fine grain film texture",
  "asymmetric composition",
  "diagonal flow from corner",
  "centered soft spotlight",
  "diffused studio lighting",
];

function pickVariationModifier(seed?: string) {
  if (!seed) {
    return BACKGROUND_VARIATION_MODIFIERS[
      Math.floor(Math.random() * BACKGROUND_VARIATION_MODIFIERS.length)
    ];
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % 2147483647;
  }
  return BACKGROUND_VARIATION_MODIFIERS[hash % BACKGROUND_VARIATION_MODIFIERS.length];
}

export function isAllowedImageMime(
  type: string
): type is (typeof ALLOWED_MIME)[number] {
  return (ALLOWED_MIME as readonly string[]).includes(type);
}

export async function buildVisualPromptFromSlide({
  slideTitle,
  slideContext,
  slideLayout,
  userInstructions,
  visualStyle = "illustration",
  brandColors,
}: {
  slideTitle: string;
  slideContext: string;
  slideLayout: string;
  userInstructions?: string;
  visualStyle?: VisualStyle;
  brandColors?: { primary: string; accent: string };
}): Promise<string> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: buildVisualPromptMetaPrompt({
      slideTitle,
      slideContext,
      slideLayout,
      userInstructions,
      visualStyle,
      brandColors,
    }),
  });

  return text.trim().slice(0, 900);
}

export async function buildBackgroundImagePrompt({
  contextLabel,
  userInstructions,
  brandColors,
  style = "gradient",
  variationSeed,
}: {
  contextLabel: string;
  userInstructions?: string;
  brandColors?: { primary: string; accent: string };
  style?: BackgroundStyle;
  variationSeed?: string;
}): Promise<string> {
  const modifier = pickVariationModifier(
    variationSeed ?? `${Date.now()}-${Math.random()}`
  );

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    temperature: 0.95,
    prompt: buildBackgroundMetaPrompt({
      contextLabel,
      userInstructions,
      brandColors,
      style,
      variationModifier: modifier,
    }),
  });

  return text.trim().slice(0, 900);
}

/** @deprecated Use buildBackgroundImagePrompt */
export async function buildBackgroundPromptFromSlide({
  slideTitle,
  slideContext,
  userInstructions,
  brandColors,
  style,
  variationSeed,
}: {
  slideTitle: string;
  slideContext: string;
  userInstructions?: string;
  brandColors?: { primary: string; accent: string };
  style?: BackgroundStyle;
  variationSeed?: string;
}): Promise<string> {
  return buildBackgroundImagePrompt({
    contextLabel: `${slideTitle}. ${slideContext || ""}`.trim(),
    userInstructions,
    brandColors,
    style,
    variationSeed,
  });
}

export async function buildVisualPromptFromUpload({
  imageBytes,
  mimeType,
  slideTitle,
  slideContext,
  userInstructions,
}: {
  imageBytes: Uint8Array;
  mimeType: string;
  slideTitle: string;
  slideContext: string;
  userInstructions?: string;
}): Promise<string> {
  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            mediaType: mimeType,
            data: imageBytes,
          },
          {
            type: "text",
            text: buildRefineVisualMetaPrompt({
              slideTitle,
              slideContext,
              userInstructions,
            }),
          },
        ],
      },
    ],
  });

  return text.trim().slice(0, 900);
}

export async function generateSlideImage(prompt: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1536x1024",
      n: 1,
    }),
  });

  if (!response.ok) {
    let message = `Image generation failed (${response.status})`;
    try {
      const err = (await response.json()) as {
        error?: { message?: string };
      };
      if (err.error?.message) message = err.error.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const json = (await response.json()) as {
    data?: Array<{ url?: string; b64_json?: string }>;
  };
  const item = json.data?.[0];
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }
  if (item?.url) {
    const imageRes = await fetch(item.url);
    if (!imageRes.ok) throw new Error("Failed to download generated image");
    return Buffer.from(await imageRes.arrayBuffer());
  }
  throw new Error("No image returned from OpenAI");
}
