import Link from "next/link";
import { notFound } from "next/navigation";
import { DeckStatusBadge } from "@/components/decks/deck-status-badge";
import { redirectIfViewer } from "@/lib/viewer-guard";
import { deckPrimaryHref, deckTypeLabel } from "@/lib/deck-labels";
import { projectPageTitle } from "@/lib/page-title";
import { requireProjectAccess } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return projectPageTitle(id);
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await redirectIfViewer();

  let project;
  try {
    const result = await requireProjectAccess(id);
    project = result.project;
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const { data: decks } = await supabase
    .from("decks")
    .select("id, name, type, status, updated_at")
    .eq("project_id", id)
    .order("updated_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/projects"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Projects
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-muted-foreground">{project.description}</p>
            )}
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
            {project.status}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project updates</CardTitle>
            <CardDescription>
              Capture goals, progress, metrics, and screenshots.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/projects/${id}/updates`}>Edit updates</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create deck</CardTitle>
            <CardDescription>
              Generate a presentation from this project&apos;s updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={`/decks/new?project=${id}`}>New deck</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {decks && decks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Recent decks</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {decks.map((deck) => (
              <li key={deck.id}>
                <Link
                  href={deckPrimaryHref(deck.id, deck.status, false)}
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">{deck.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {deckTypeLabel(deck.type)}
                    </p>
                  </div>
                  <DeckStatusBadge status={deck.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
