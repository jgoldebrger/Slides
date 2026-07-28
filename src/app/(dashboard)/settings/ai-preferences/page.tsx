import type { Metadata } from "next";
import { OrgAiSettingsForm } from "@/components/settings/org-ai-settings-form";
import { SettingsSection } from "@/components/settings/settings-section";
import { requireSettingsAdmin } from "@/lib/settings-guard";

export const metadata: Metadata = { title: "AI preferences · Settings" };

export default async function SettingsAiPreferencesPage() {
  await requireSettingsAdmin();

  return (
    <SettingsSection
      title="AI preferences"
      description="Natural-language instructions that apply across AI features in this workspace."
    >
      <OrgAiSettingsForm />
    </SettingsSection>
  );
}
