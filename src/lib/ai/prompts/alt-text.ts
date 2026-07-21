export function buildAltTextPrompt({
  slideTitle,
  slideContext,
}: {
  slideTitle: string;
  slideContext: string;
}) {
  return `Write concise, accessible alt text for a presentation slide image.

Rules:
- Describe what is visually important for someone who cannot see the image.
- Max 250 characters.
- No "image of" or "picture showing" filler.
- Do not invent details not supported by the slide context.

Slide title: ${slideTitle}
Slide context: ${slideContext}`;
}
