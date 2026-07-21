import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TeamManagement } from "@/components/settings/team-management";
import { getSignupSettings, listTeamMembers } from "@/lib/actions/team";
import { getOrgContext } from "@/lib/viewer-guard";
import { canManageTeam } from "@/lib/roles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Team" };

export default async function TeamSettingsPage() {
  const { role, isViewer } = await getOrgContext();
  if (isViewer) redirect("/decks");
  if (!canManageTeam(role)) redirect("/settings");

  let members: Awaited<ReturnType<typeof listTeamMembers>> = [];
  let isDefaultSignupOrg = false;
  let loadError: string | null = null;

  try {
    const [memberList, signup] = await Promise.all([
      listTeamMembers(),
      getSignupSettings(),
    ]);
    members = memberList;
    isDefaultSignupOrg = signup.isDefaultOrg;
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Failed to load team members";
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          ← Settings
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Team</h1>
        <p className="text-muted-foreground">
          Invite teammates and manage roles for this workspace.
        </p>
      </div>

      {loadError ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Could not load team</CardTitle>
            <CardDescription role="alert">{loadError}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : (
        <TeamManagement
          members={members}
          actorRole={role}
          isDefaultSignupOrg={isDefaultSignupOrg}
        />
      )}
    </div>
  );
}
