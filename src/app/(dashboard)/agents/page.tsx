import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { AiAgentsDashboard } from "@/components/ai/ai-agents-dashboard";
import { getOrgContext } from "@/lib/viewer-guard";
import { canManageTeam } from "@/lib/roles";

export const metadata: Metadata = { title: "AI Agents" };

export default async function AgentsPage() {
  const { isViewer, role } = await getOrgContext();
  if (isViewer || !canManageTeam(role)) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="AI Agents"
        description="Schedule and run automated deck agents — Friday drafts, refresh, approvals, and more."
      />
      <AiAgentsDashboard />
    </div>
  );
}
