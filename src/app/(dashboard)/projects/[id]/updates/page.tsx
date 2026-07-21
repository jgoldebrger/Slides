import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectUpdatesForm } from "@/components/projects/project-updates-form";
import { projectPageTitle } from "@/lib/page-title";
import { redirectIfViewer } from "@/lib/viewer-guard";
import { requireProjectAccess } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ProjectUpdateInput } from "@/lib/validations";

const emptyUpdate: ProjectUpdateInput = {
  goals: [],
  progress: "",
  completed_work: [],
  current_tasks: [],
  milestones: [],
  metrics: [],
  risks: [],
  blockers: [],
  next_steps: [],
  screenshots: [],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return projectPageTitle(id, "Updates");
}

export default async function ProjectUpdatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await redirectIfViewer();

  try {
    await requireProjectAccess(id);
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", id)
    .single();

  const { data: updates } = await supabase
    .from("project_updates")
    .select("*")
    .eq("project_id", id)
    .single();

  const initialData: ProjectUpdateInput = updates
    ? {
        goals: (updates.goals as string[]) ?? [],
        progress: updates.progress ?? "",
        completed_work: (updates.completed_work as string[]) ?? [],
        current_tasks:
          (updates.current_tasks as ProjectUpdateInput["current_tasks"]) ?? [],
        milestones:
          (updates.milestones as ProjectUpdateInput["milestones"]) ?? [],
        metrics: (updates.metrics as ProjectUpdateInput["metrics"]) ?? [],
        risks: (updates.risks as ProjectUpdateInput["risks"]) ?? [],
        blockers: (updates.blockers as string[]) ?? [],
        next_steps: (updates.next_steps as string[]) ?? [],
        screenshots:
          (updates.screenshots as ProjectUpdateInput["screenshots"]) ?? [],
      }
    : emptyUpdate;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${id}`}
          className="text-sm text-link underline-offset-4 hover:underline"
        >
          ← {project?.name ?? "Project"}
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          Project updates
        </h1>
        <p className="text-muted-foreground">
          Capture structured updates to power your presentation decks.
        </p>
        <div className="mt-4">
          <Link
            href={`/decks/new?project=${id}`}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Create deck from these updates
          </Link>
        </div>
      </div>
      <ProjectUpdatesForm projectId={id} initialData={initialData} />
    </div>
  );
}
