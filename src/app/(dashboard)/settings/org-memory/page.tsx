import type { Metadata } from "next";
import { OrgPortfolioPanel } from "@/components/settings/org-portfolio-panel";
import { SettingsSection } from "@/components/settings/settings-section";
import { requireSettingsAdmin } from "@/lib/settings-guard";

export const metadata: Metadata = { title: "Org memory · Settings" };

export default async function SettingsOrgMemoryPage() {
  await requireSettingsAdmin();

  return (
    <SettingsSection
      title="Org memory"
      description="Portfolio rollups and insight patterns across projects."
    >
      <OrgPortfolioPanel />
    </SettingsSection>
  );
}
