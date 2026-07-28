import type { Metadata } from "next";
import { AiAddonsHub } from "@/components/decks/ai-addons-hub";
import { SettingsSection } from "@/components/settings/settings-section";
import { requireSettingsAdmin } from "@/lib/settings-guard";

export const metadata: Metadata = { title: "Add-ons · Settings" };

export default async function SettingsAiAddonsPage() {
  await requireSettingsAdmin();

  return (
    <SettingsSection
      title="AI add-ons"
      description="Optional advanced AI tools. Enable what you need — run them from project or deck views."
    >
      <AiAddonsHub scope="org" variant="manage" />
    </SettingsSection>
  );
}
