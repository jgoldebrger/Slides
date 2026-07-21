import type { BackgroundStyle, VisualStyle } from "@/lib/ai/visuals";

export const VISUAL_STYLE_HINTS: Record<VisualStyle, string> = {
  illustration:
    "Modern flat vector illustration with clean shapes and subtle depth",
  photo: "Professional stock-style photography, natural lighting, realistic",
  diagram:
    "Clear labeled diagram or process flow with simple icons and arrows",
  chart: "Clean data visualization or infographic with readable labels",
  abstract:
    "Abstract geometric background with brand-aligned colors, minimal text",
};

export const BACKGROUND_STYLE_HINTS: Record<BackgroundStyle, string> = {
  gradient:
    "Smooth diagonal color gradient with gentle light leak, airy and unobtrusive",
  geometric:
    "Subtle overlapping geometric shapes, low-opacity triangles and arcs, modern corporate",
  mesh: "Modern mesh gradient with soft aurora-like color blends, contemporary tech aesthetic",
  organic:
    "Soft watercolor wash with organic fluid shapes, painterly and calm",
  minimal: "Clean off-white canvas with faint paper grain or linen texture",
  dark: "Deep charcoal-to-navy gradient with subtle vignette, premium executive feel",
  warm: "Warm sand, peach, and amber tones with soft radial glow, inviting atmosphere",
};

export function buildVisualPromptMetaPrompt({
  slideTitle,
  slideContext,
  slideLayout,
  userInstructions,
  visualStyle,
  brandColors,
}: {
  slideTitle: string;
  slideContext: string;
  slideLayout: string;
  userInstructions?: string;
  visualStyle: VisualStyle;
  brandColors?: { primary: string; accent: string };
}) {
  const brandLine = brandColors
    ? `Use brand colors: primary ${brandColors.primary}, accent ${brandColors.accent}.`
    : "Use a professional blue and neutral corporate palette.";

  return `You are a presentation designer creating imagery for executive project-update decks.

Create ONE image generation prompt for a polished, professional 16:9 presentation slide visual.

Requirements:
- Visual style: ${VISUAL_STYLE_HINTS[visualStyle]}
- ${brandLine}
- Match the slide topic; use ONLY facts from the slide context below
- High contrast, clean composition, presentation-ready
- No watermarks, fake logos, or invented metrics/dates
- Minimal readable text only if essential for diagrams or charts

Slide layout: ${slideLayout}
Slide title: ${slideTitle}
Slide context: ${slideContext || "N/A"}
User instructions: ${userInstructions || "Create an engaging visual that supports this slide"}

Return ONLY the image generation prompt (max 900 characters). No quotes or explanation.`;
}

export function buildBackgroundMetaPrompt({
  contextLabel,
  userInstructions,
  brandColors,
  style,
  variationModifier,
}: {
  contextLabel: string;
  userInstructions?: string;
  brandColors?: { primary: string; accent: string };
  style: BackgroundStyle;
  variationModifier: string;
}) {
  const brandLine = brandColors
    ? `Incorporate brand colors ${brandColors.primary} and ${brandColors.accent} subtly — never dominant or saturated.`
    : "Use a refined neutral corporate palette with one accent hue.";

  return `Write ONE image-generation prompt for a 16:9 presentation slide BACKGROUND (not foreground content).

Style family: ${BACKGROUND_STYLE_HINTS[style]}
Variation direction: ${variationModifier}
${brandLine}
Presentation topic hint: ${contextLabel}
User direction: ${userInstructions || "Unique, non-repetitive, suitable behind white text overlay"}

Hard rules for the image prompt you write:
- Describe a UNIQUE composition — avoid generic "blue gradient" unless user asked
- NO text, logos, watermarks, people, charts, or busy details
- Soft, low-contrast, readable under 80% white overlay
- Max 900 characters

Return ONLY the image prompt. No quotes or explanation.`;
}

export function buildRefineVisualMetaPrompt({
  slideTitle,
  slideContext,
  userInstructions,
}: {
  slideTitle: string;
  slideContext: string;
  userInstructions?: string;
}) {
  return `You are a presentation designer. The user uploaded a rough visual (screenshot, sketch, wireframe, or draft chart).

Create ONE DALL-E image prompt for a polished, professional 16:9 presentation slide visual that:
- Preserves the intent, labels, and data visible in the upload
- Uses a clean corporate style suitable for executive project-update decks
- Has high contrast, readable text if any, and no watermarks or fake logos
- Does not invent metrics or dates not visible in the upload

Slide title: ${slideTitle}
Slide context: ${slideContext || "N/A"}
User instructions: ${userInstructions || "Polish this into a presentation-ready visual"}

Return ONLY the image generation prompt (max 900 characters). No quotes or explanation.`;
}

export function buildAnnotatePolishMetaPrompt({
  slideTitle,
  slideContext,
  userInstructions,
  keepAnnotations,
  brandColors,
}: {
  slideTitle: string;
  slideContext: string;
  userInstructions?: string;
  keepAnnotations: boolean;
  brandColors?: { primary: string; accent: string };
}) {
  const brandLine = brandColors
    ? `Use brand colors: primary ${brandColors.primary}, accent ${brandColors.accent}.`
    : "Use a professional blue and neutral corporate palette.";

  const annotationRule = keepAnnotations
    ? `The upload includes user markup (highlights, arrows, boxes, blur regions, labels). Preserve that markup EXACTLY in the output — same positions, colors, and shapes. Only improve overall clarity, lighting, and presentation quality beneath/around the marks.`
    : `The upload includes editor markup (highlights, arrows, boxes, labels) that indicates what to emphasize. Use those marks as GUIDANCE ONLY — do NOT reproduce pen strokes, highlighter, arrows, or annotation boxes in the final image. Produce a clean, presentation-ready visual that reflects the emphasized areas and content.`;

  return `You are a presentation designer. The user annotated a slide image and wants it polished for an executive project-update deck.

Create ONE image generation prompt for a polished, professional 16:9 presentation slide visual that:
- ${annotationRule}
- ${brandLine}
- Preserves factual content, labels, and data from the underlying image
- High contrast, readable text if any, no watermarks or fake logos
- Does not invent metrics or dates not present in the source

Slide title: ${slideTitle}
Slide context: ${slideContext || "N/A"}
User instructions: ${userInstructions || "Polish into a presentation-ready visual"}

Return ONLY the image generation prompt (max 900 characters). No quotes or explanation.`;
}

/** Fast image prompt when vision meta-prompt times out or is skipped. */
export function buildAnnotatePolishDirectPrompt({
  slideTitle,
  slideContext,
  userInstructions,
  keepAnnotations,
  brandColors,
}: {
  slideTitle: string;
  slideContext: string;
  userInstructions?: string;
  keepAnnotations: boolean;
  brandColors?: { primary: string; accent: string };
}) {
  const brandLine = brandColors
    ? `Brand colors primary ${brandColors.primary}, accent ${brandColors.accent}.`
    : "Professional blue and neutral corporate palette.";

  const annotationRule = keepAnnotations
    ? "Preserve user annotation markup exactly."
    : "Remove editor markup; use highlighted areas as guidance only.";

  const prompt = [
    `Polished 16:9 executive presentation visual for slide "${slideTitle}".`,
    annotationRule,
    brandLine,
    `Context: ${slideContext || "project update"}.`,
    `Edits: ${userInstructions || "Polish for a clean corporate deck."}`,
    "High contrast, no watermarks, no invented data.",
  ].join(" ");

  return prompt.slice(0, 900);
}
