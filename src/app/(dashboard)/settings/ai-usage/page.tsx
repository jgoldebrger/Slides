import type { Metadata } from "next";
import { AiCostMeter } from "@/components/ai/ai-cost-meter";
import { SettingsSection } from "@/components/settings/settings-section";
import { requireSettingsAdmin } from "@/lib/settings-guard";

export const metadata: Metadata = { title: "Usage · Settings" };

export default async function SettingsAiUsagePage() {
  await requireSettingsAdmin();

  return (
    <SettingsSection
      title="AI usage"
      description="Token usage and estimated cost this month."
    >
      <AiCostMeter embedded />
    </SettingsSection>
  );
}
