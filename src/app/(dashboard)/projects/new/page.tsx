import type { Metadata } from "next";
import Link from "next/link";
import { redirectIfViewer } from "@/lib/viewer-guard";
import { NewProjectForm } from "@/components/projects/new-project-form";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  await redirectIfViewer();
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/projects"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Projects
        </Link>
        <h1 className="mt-2 text-xl font-semibold">New project</h1>
        <p className="text-muted-foreground">
          Create a project workspace for updates and decks.
        </p>
      </div>
      <NewProjectForm />
    </div>
  );
}
