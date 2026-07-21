import type { Metadata } from "next";
import Link from "next/link";
import { redirectIfViewer } from "@/lib/viewer-guard";
import { getUserOrg } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { ProjectList } from "@/components/projects/project-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  await redirectIfViewer();
  const { orgId } = await getUserOrg();
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, status, updated_at")
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage project update workspaces."
        action={
          <Button asChild>
            <Link href="/projects/new">New project</Link>
          </Button>
        }
      />

      {!projects?.length ? (
        <EmptyState
          title="No projects"
          description="Create a project to capture goals, progress, and screenshots."
          action={
            <Button asChild>
              <Link href="/projects/new">Create project</Link>
            </Button>
          }
        />
      ) : (
        <ProjectList projects={projects} />
      )}
    </div>
  );
}
