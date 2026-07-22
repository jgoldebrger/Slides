import { z } from "zod";
import { addonLlm } from "@/lib/ai/addons/helpers";

export async function i25SparklineHistory(
  snapshots: Array<{ label: string; value: number }>
) {
  const schema = z.object({
    chartData: z.array(z.object({ label: z.string(), value: z.number() })),
    insight: z.string(),
  });
  return addonLlm(schema, `Build sparkline data from history.\n${JSON.stringify(snapshots)}`);
}

export async function i26TableInsights(tableText: string) {
  const schema = z.object({
    takeaways: z.array(z.string()).min(3).max(3),
    keepTable: z.boolean(),
    trimmedRows: z.array(z.string()).optional(),
  });
  return addonLlm(schema, `Table to 3 insights.\n${tableText}`);
}

export async function i27UnitsLocale(slides: unknown) {
  const schema = z.object({
    changes: z.array(z.object({ location: z.string(), before: z.string(), after: z.string() })),
  });
  return addonLlm(schema, `Normalize units/locale across deck.\n${JSON.stringify(slides)}`);
}

export async function i28IconSuggest(bullets: string[]) {
  const schema = z.object({
    icons: z.array(z.object({ bullet: z.string(), keyword: z.string() })),
  });
  return addonLlm(schema, `Suggest brand-safe icon keywords.\n${bullets.join("\n")}`);
}

export async function i29WhitespaceCoach(slideContent: string) {
  const schema = z.object({
    densityScore: z.number(),
    cutBullets: z.array(z.string()),
  });
  const words = slideContent.split(/\s+/).length;
  const densityScore = Math.min(100, Math.round(words / 2));
  const llm = await addonLlm(
    z.object({ cutBullets: z.array(z.string()) }),
    `Suggest 2 bullets to cut for whitespace.\n${slideContent}`
  );
  return { densityScore, cutBullets: llm.cutBullets };
}

export async function i30CalloutHierarchy(metrics: unknown) {
  const schema = z.object({
    heroMetric: z.string(),
    layout: z.literal("callout"),
    supporting: z.array(z.string()),
  });
  return addonLlm(schema, `Pick hero metric callout.\n${JSON.stringify(metrics)}`);
}

export async function i31RiskHeat(risks: unknown) {
  const schema = z.object({
    items: z.array(
      z.object({
        risk: z.string(),
        likelihood: z.enum(["low", "medium", "high"]),
        impact: z.enum(["low", "medium", "high"]),
      })
    ),
  });
  return addonLlm(schema, `Risk heat matrix.\n${JSON.stringify(risks)}`);
}

export async function i32DependencyGraph(blockers: unknown) {
  const schema = z.object({
    nodes: z.array(z.object({ id: z.string(), label: z.string() })),
    edges: z.array(z.object({ from: z.string(), to: z.string() })),
  });
  return addonLlm(schema, `Dependency graph JSON.\n${JSON.stringify(blockers)}`);
}

export async function i33ComparisonFrame(
  current: Record<string, unknown>,
  previous: Record<string, unknown>
) {
  const schema = z.object({
    leftTitle: z.string(),
    rightTitle: z.string(),
    leftBullets: z.array(z.string()),
    rightBullets: z.array(z.string()),
  });
  return addonLlm(
    schema,
    `Week-over-week comparison.\nCurrent: ${JSON.stringify(current)}\nPrevious: ${JSON.stringify(previous)}`
  );
}

export async function i34FootnoteStrip(chartContext: string) {
  const schema = z.object({ footnotes: z.array(z.string()) });
  return addonLlm(schema, `Footnote sources for chart.\n${chartContext}`);
}

export async function i35AltGrader(altText: string, slideTitle: string) {
  const schema = z.object({
    score: z.number().min(0).max(100),
    rewrite: z.string(),
  });
  return addonLlm(schema, `Grade and rewrite alt text for "${slideTitle}": ${altText}`);
}

export async function i36SoWhatFooter(slideBody: string) {
  const schema = z.object({ implication: z.string() });
  return addonLlm(schema, `One-line so-what footer.\n${slideBody}`);
}
