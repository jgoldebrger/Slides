import { aiTonePromptHint, type AiTone } from "@/lib/ai/tone";
import { audiencePromptHint, type DeckAudience } from "@/lib/ai/audience";

export function buildChartNarrativePrompt({
  title,
  content,
  projectMetrics,
  aiTone = "executive",
  audience = "general",
}: {
  title: string;
  content: unknown;
  projectMetrics?: unknown;
  aiTone?: AiTone;
  audience?: DeckAudience;
}) {
  return `You are a data storytelling expert for project status presentations.

Improve this chart slide with a clear narrative. Use ONLY real metrics from the project data — do not invent numbers.

Voice / tone:
- ${aiTonePromptHint(aiTone)}

Audience:
- ${audiencePromptHint(audience)}

Return:
- chartType: best chart type (bar|line|pie|area) for this data
- caption: short chart title shown above the visual
- takeaway: one sentence insight for executives
- body: 1-2 sentences supporting context beneath the chart
- chartData: array of { name, value } points sourced from project metrics

Slide title: ${title}
Current content: ${JSON.stringify(content)}

Project metrics (JSON):
${JSON.stringify(projectMetrics ?? [], null, 2)}`;
}
