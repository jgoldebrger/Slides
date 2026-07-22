import { describe, expect, it } from "vitest";
import { buildOutlinePrompt } from "@/lib/ai/prompts/outline";
import { analyzeProjectUpdates } from "@/lib/ai/analyze-project-updates";
import type { ProjectUpdateSectionId } from "@/lib/ai/update-sections";

describe("buildOutlinePrompt", () => {
  const includedSections: ProjectUpdateSectionId[] = ["progress", "metrics"];
  const baseArgs = {
    deckType: "project_status" as const,
    projectName: "Acme Launch",
    updates: {
      progress: "Revenue up 12% in Q2.",
      metrics: [{ label: "Revenue", value: "$1.2M", trend: "up" }],
    },
    includedSections,
    deckBrief: "Exec readout — lead with revenue.",
  };

  it("includes narrative design rules and discourages field-named slides", () => {
    const prompt = buildOutlinePrompt(baseArgs);
    expect(prompt).toContain("Do NOT name slides after form fields");
    expect(prompt).toContain("Do NOT create one slide per update tab/field");
    expect(prompt).toContain("Invent slide titles from facts");
  });

  it("includes content digest when analysis is provided", () => {
    const contentAnalysis = analyzeProjectUpdates(baseArgs.updates);
    const prompt = buildOutlinePrompt({ ...baseArgs, contentAnalysis });
    expect(prompt).toContain("Content analysis");
    expect(prompt).toContain(contentAnalysis.contentDigest);
    expect(prompt).toContain(
      `${contentAnalysis.slideCountMin}–${contentAnalysis.slideCountMax} slides`
    );
  });

  it("limits facts to included sections in data rules", () => {
    const prompt = buildOutlinePrompt(baseArgs);
    expect(prompt).toContain("Facts available for this deck are limited to");
    expect(prompt).toContain("Progress, Metrics");
    expect(prompt).not.toMatch(/project update fields:.*Risks/);
  });

  it("uses soft framing without slide topic templates", () => {
    const prompt = buildOutlinePrompt(baseArgs);
    expect(prompt).toContain("Deck framing (soft guidance only)");
    expect(prompt).not.toContain("Balanced status deck: progress");
    expect(prompt).not.toContain("Start with a title slide");
    expect(prompt).not.toContain("end with next steps");
  });

  it("includes deck brief when provided", () => {
    const prompt = buildOutlinePrompt(baseArgs);
    expect(prompt).toContain("Exec readout — lead with revenue.");
  });
});
