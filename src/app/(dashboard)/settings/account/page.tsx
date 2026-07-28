import type { Metadata } from "next";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import { SettingsSection } from "@/components/settings/settings-section";
import { getProfileSettings } from "@/lib/actions/profile";
import { requireSettingsAccess } from "@/lib/settings-guard";

export const metadata: Metadata = { title: "Account · Settings" };

export default async function SettingsAccountPage() {
  await requireSettingsAccess();
  const profile = await getProfileSettings();

  return (
    <SettingsSection
      title="Account"
      description="Your profile and notification preferences."
    >
      <ProfileSettingsForm initial={profile} />
    </SettingsSection>
  );
}
