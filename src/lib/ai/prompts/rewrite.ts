import type { SlideLayout } from "@/types/slide";

export function buildRewriteSlidePrompt({
  layout,
  title,
  content,
}: {
  layout: SlideLayout;
  title: string;
  content: unknown;
}) {
  return `Rewrite this slide for a project update deck. Keep factual — do not invent metrics or dates.
Layout: ${layout}
Title: ${title}
Current content: ${JSON.stringify(content)}`;
}
