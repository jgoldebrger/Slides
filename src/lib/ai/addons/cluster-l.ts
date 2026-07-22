import { z } from "zod";
import { addonLlm } from "@/lib/ai/addons/helpers";

export async function l61DependencyRadar(
  projects: Array<{ name: string; blockers: unknown }>
) {
  const schema = z.object({
    sharedBlockers: z.array(z.object({ theme: z.string(), projects: z.array(z.string()) })),
  });
  return addonLlm(schema, `Cross-project dependency radar.\n${JSON.stringify(projects)}`);
}

export async function l62ThemeCluster(updates: unknown[]) {
  const schema = z.object({
    themes: z.array(z.object({ topic: z.string(), summary: z.string() })),
  });
  return addonLlm(schema, `Cluster themes across updates.\n${JSON.stringify(updates)}`);
}

export async function l63ExecDigest(
  decks: Array<{ name: string; outline: unknown }>
) {
  const schema = z.object({
    subject: z.string(),
    body: z.string(),
    highlights: z.array(z.string()),
  });
  return addonLlm(schema, `Sunday exec digest across decks.\n${JSON.stringify(decks)}`, "strong");
}

export async function l64Scorecard(metrics: unknown) {
  const schema = z.object({
    items: z.array(
      z.object({
        name: z.string(),
        status: z.enum(["red", "amber", "green"]),
        note: z.string(),
      })
    ),
  });
  return addonLlm(schema, `OKR RAG scorecard.\n${JSON.stringify(metrics)}`);
}

export async function l65ChurnRisk(updates: Record<string, unknown>) {
  const schema = z.object({
    riskLevel: z.enum(["low", "medium", "high"]),
    signals: z.array(z.string()),
  });
  return addonLlm(schema, `Churn/cancel language signals.\n${JSON.stringify(updates)}`);
}

export async function l66BenchmarkAnon(peerStats: unknown) {
  const schema = z.object({
    comparison: z.string(),
    percentile: z.number(),
  });
  return addonLlm(schema, `Anonymized benchmark narrative.\n${JSON.stringify(peerStats)}`);
}

export async function l67PlaybookRecommend(outline: unknown) {
  const schema = z.object({
    suggestions: z.array(z.object({ item: z.string(), reason: z.string() })),
  });
  return addonLlm(schema, `Playbook: decks like this usually include…\n${JSON.stringify(outline)}`);
}

export async function l68SkillGap(blockers: unknown) {
  const schema = z.object({
    themes: z.array(z.object({ skill: z.string(), evidence: z.string() })),
  });
  return addonLlm(schema, `Hiring/training themes from blockers.\n${JSON.stringify(blockers)}`);
}

export async function l69BudgetNarrative(financePaste: string) {
  const schema = z.object({
    varianceStory: z.string(),
    bullets: z.array(z.string()),
  });
  return addonLlm(schema, `Budget variance narrative.\n${financePaste}`);
}

export async function l70CompliancePack(slides: unknown, evidence: unknown) {
  const schema = z.object({
    issues: z.array(z.object({ claim: z.string(), supported: z.boolean() })),
  });
  return addonLlm(
    schema,
    `SOC2/compliance claims vs evidence.\nSlides: ${JSON.stringify(slides)}\nEvidence: ${JSON.stringify(evidence)}`
  );
}

export async function l71TemplateLearn(decks: unknown[]) {
  const schema = z.object({
    template: z.object({ slides: z.array(z.object({ title: z.string(), role: z.string() })) }),
  });
  return addonLlm(schema, `Mine outline template from best decks.\n${JSON.stringify(decks)}`);
}

export async function l72StakeholderPrefs(note: string) {
  const schema = z.object({
    preferences: z.record(z.string(), z.string()),
    summary: z.string(),
  });
  return addonLlm(schema, `Extract stakeholder prefs: ${note}`);
}
