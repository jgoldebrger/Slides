import type { Metadata } from "next";
import { OrgAiFeatureCatalog } from "@/components/settings/org-ai-feature-catalog";
import { SettingsSection } from "@/components/settings/settings-section";
import { requireSettingsAdmin } from "@/lib/settings-guard";

export const metadata: Metadata = { title: "Features · Settings" };

export default async function SettingsAiFeaturesPage() {
  await requireSettingsAdmin();

  return (
    <SettingsSection
      title="Core AI features"
      description="Enable or disable built-in AI capabilities for your organization."
    >
      <OrgAiFeatureCatalog />
    </SettingsSection>
  );
}
