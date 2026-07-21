"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { captureEvent } from "@/components/analytics/posthog-provider";
import { createDeck } from "@/lib/actions/projects";
import { DECK_TYPES } from "@/types/slide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Project = { id: string; name: string };

function defaultProjectId(projects: Project[], preselected: string | null) {
  if (preselected && projects.some((p) => p.id === preselected)) {
    return preselected;
  }
  if (projects.length === 1) return projects[0].id;
  return "";
}

export function NewDeckForm({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(() =>
    defaultProjectId(projects, searchParams.get("project"))
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await createDeck(formData);

    if ("error" in result && result.error) {
      const errors = result.error as Record<string, string[] | undefined>;
      const message =
        errors._form?.[0] ?? errors.name?.[0] ?? "Failed to create deck";
      toast.error(message);
      setLoading(false);
      return;
    }

    if (result.data?.id) {
      captureEvent("deck_created", { deck_id: result.data.id });
      toast.success("Deck created");
      router.push(`/decks/${result.data.id}/outline`);
      router.refresh();
    }
    setLoading(false);
  }

  if (!projects.length) {
    return (
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <p className="text-muted-foreground">
            Create a project first before adding a deck.
          </p>
          <Button asChild>
            <Link href="/projects/new">Create a project</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Deck details</CardTitle>
        <CardDescription>
          Choose a project and deck type to generate an outline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project_id">Project</Label>
            <select
              id="project_id"
              name="project_id"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="" disabled>
                Select project…
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Deck name</Label>
            <Input
              id="name"
              name="name"
              placeholder="March status update"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Deck type</Label>
            <select
              id="type"
              name="type"
              defaultValue="project_status"
              className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {DECK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading || !projectId}>
              {loading ? "Creating…" : "Create deck"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
