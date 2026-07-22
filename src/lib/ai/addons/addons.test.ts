import { describe, expect, it } from "vitest";
import { AI_ADDON_CATALOG, AI_ADDON_FEATURE_IDS, TOP_12_ADDON_IDS } from "@/lib/ai/addons/catalog";
import { isAiAddonEnabled } from "@/lib/ai/addon-flags";
import {
  groundednessScore,
  numbersNotInUpdates,
  scanSecrets,
  scrubPii,
} from "@/lib/ai/addons/helpers";
import { m73Groundedness, m77SecretScan, m78ModelRouter } from "@/lib/ai/addons/cluster-m";

describe("AI addons catalog", () => {
  it("defines exactly 100 add-ons", () => {
    expect(AI_ADDON_CATALOG).toHaveLength(100);
    expect(AI_ADDON_FEATURE_IDS).toHaveLength(100);
  });

  it("has 12 top-priority add-ons", () => {
    expect(TOP_12_ADDON_IDS).toHaveLength(12);
  });

  it("enables addons by default", () => {
    expect(isAiAddonEnabled("addon_m_73_groundedness")).toBe(true);
    expect(isAiAddonEnabled("addon_n_93_friday_agent")).toBe(true);
  });
});

describe("addon helpers", () => {
  it("scrubs PII", () => {
    const { scrubbed, redactions } = scrubPii("Contact jane@acme.com");
    expect(scrubbed).toContain("[email]");
    expect(redactions).toBeGreaterThan(0);
  });

  it("blocks secrets", () => {
    expect(scanSecrets("key sk-abcdefghijklmnopqrstuvwxyz123456").safe).toBe(false);
  });

  it("finds ungrounded numbers", () => {
    const hits = numbersNotInUpdates("Revenue hit 999%", { metrics: [{ value: "42%" }] });
    expect(hits).toContain("999%");
  });

  it("scores groundedness", () => {
    expect(groundednessScore(8, 10).level).toBe("high");
    expect(m73Groundedness(2, 10).level).toBe("low");
  });

  it("routes models", () => {
    expect(m78ModelRouter("outline").tier).toBe("strong");
    expect(m78ModelRouter("chip").tier).toBe("fast");
  });

  it("secret scan export", () => {
    expect(m77SecretScan("hello").safe).toBe(true);
  });
});
