import { redirect } from "next/navigation";
import { PostHogIdentify } from "@/components/analytics/posthog-identify";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { listUserOrgs } from "@/lib/org-context";
import { getOrgContext } from "@/lib/viewer-guard";
import { isViewerRole, canManageTeam as userCanManageTeam } from "@/lib/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let orgName = "Workspace";
  let orgId = "";
  let userEmail = "";
  let userId = "";
  let isViewer = false;
  let canManageTeam = false;

  try {
    const ctx = await getOrgContext();
    orgName = ctx.orgName;
    orgId = ctx.orgId;
    userEmail = ctx.user.email ?? "";
    userId = ctx.user.id;
    isViewer = isViewerRole(ctx.role);
    canManageTeam = userCanManageTeam(ctx.role);
  } catch {
    redirect("/login");
  }

  const orgs = await listUserOrgs();

  return (
    <PostHogProvider>
      <PostHogIdentify userId={userId} email={userEmail} orgId={orgId} />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <div className="flex min-h-screen flex-col bg-background md:flex-row md:items-start">
        <DashboardSidebar
          orgName={orgName}
          userEmail={userEmail}
          isViewer={isViewer}
          canManageTeam={canManageTeam}
          orgs={orgs}
          activeOrgId={orgId}
        />
        <main id="main-content" className="flex-1 overflow-auto">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
            {children}
          </div>
        </main>
      </div>
    </PostHogProvider>
  );
}
