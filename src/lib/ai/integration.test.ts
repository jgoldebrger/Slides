import { describe, expect, it } from "vitest";
import { AI_FEATURE_IDS, isAiFeatureEnabled } from "@/lib/ai/feature-flags";
import { AI_ADDON_FEATURE_IDS } from "@/lib/ai/addons/catalog";
import { isAiAddonEnabled } from "@/lib/ai/addon-flags";
import * as intake from "@/lib/ai/intake";
import * as generation from "@/lib/ai/generation";
import * as editor from "@/lib/ai/editor";
import * as present from "@/lib/ai/present";
import * as orgMemory from "@/lib/ai/org-memory";

describe("AI platform integration", () => {
  it("exposes catalog feature IDs", () => {
    expect(AI_FEATURE_IDS.length).toBeGreaterThanOrEqual(50);
  });

  it("enables trust features by default", () => {
    expect(isAiFeatureEnabled("trust_citations")).toBe(true);
    expect(isAiFeatureEnabled("trust_activity_timeline")).toBe(true);
  });

  it("exports workstream modules", () => {
    expect(typeof intake.parseVoiceTranscriptToUpdates).toBe("function");
    expect(typeof generation.generateOutlineVariants).toBe("function");
    expect(typeof editor.rewriteTextChip).toBe("function");
    expect(typeof present.estimatePaceScore).toBe("function");
    expect(typeof orgMemory.buildPortfolioRollup).toBe("function");
  });

  it("exposes 100 net-new addon IDs", () => {
    expect(AI_ADDON_FEATURE_IDS).toHaveLength(100);
    expect(isAiAddonEnabled("addon_j_41_number_highlight")).toBe(true);
  });
});
