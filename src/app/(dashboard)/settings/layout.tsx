import { PageHeader } from "@/components/shared/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { requireSettingsAccess } from "@/lib/settings-guard";
import { canManageTeam } from "@/lib/roles";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await requireSettingsAccess();
  const isAdmin = canManageTeam(role);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Settings"
        description="Account, billing, and workspace configuration."
      />
      <SettingsNav isAdmin={isAdmin} />
      {children}
    </div>
  );
}
