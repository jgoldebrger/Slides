import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrgContext } from "@/lib/viewer-guard";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/shared/state";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { orgId, isViewer } = await getOrgContext();
  if (isViewer) redirect("/decks");

  const supabase = await createClient();

  const [{ count: projectCount }, { count: deckCount }] = await Promise.all([
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("decks")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  const hasProjects = (projectCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Create project updates and turn them into presentation decks."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projects</CardTitle>
            <CardDescription>Active project workspaces</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{projectCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Decks</CardTitle>
            <CardDescription>Presentation decks created</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{deckCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {!hasProjects ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start capturing updates and building decks."
          action={
            <Button asChild>
              <Link href="/projects/new">Create project</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href="/projects/new">New project</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/decks/new">New deck</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
