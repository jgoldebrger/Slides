import type { Metadata } from "next";
import { AiConnectorsPanel } from "@/components/ai/ai-connectors-panel";
import { SettingsSection } from "@/components/settings/settings-section";
import { requireSettingsAdmin } from "@/lib/settings-guard";

export const metadata: Metadata = { title: "Connectors · Settings" };

export default async function SettingsConnectorsPage() {
  await requireSettingsAdmin();

  return (
    <SettingsSection
      title="Connectors"
      description="Intake sources like Slack, Jira, and email for project updates."
    >
      <AiConnectorsPanel />
    </SettingsSection>
  );
}
