import type { SlideLayout } from "@/types/slide";

/** Heuristic layout picker from title + content hint (used before AI fill). */
export function suggestLayoutForContent(
  title: string,
  contentHint = ""
): SlideLayout {
  const text = `${title} ${contentHint}`.toLowerCase();

  if (/\b(title|cover|intro|welcome)\b/.test(text)) return "title";
  if (/\b(section|break|agenda)\b/.test(text)) return "section_break";
  if (/\b(quote|testimonial|feedback)\b/.test(text)) return "quote";
  if (/\b(chart|graph|trend|plot)\b/.test(text)) return "chart";
  if (/\b(metric|kpi|score|revenue|nps|%)\b/.test(text)) return "metrics_grid";
  if (/\b(timeline|milestone|roadmap|schedule)\b/.test(text)) return "timeline";
  if (/\b(image|screenshot|photo|visual)\b/.test(text)) return "image_caption";
  if (/\b(compare|versus|vs\.|two column|pros and cons)\b/.test(text)) {
    return "two_column";
  }

  return "bullets";
}

export function layoutSuggestionHint(title: string, summary: string): string {
  const layout = suggestLayoutForContent(title, summary);
  return `Suggested layout for this slide: ${layout} (based on content density and type).`;
}
