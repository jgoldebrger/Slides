"use client";

import { useMemo, useState } from "react";
import { ProjectListRow } from "@/components/projects/project-list-row";
import { Input } from "@/components/ui/input";
import {
  SEARCH_DEBOUNCE_MS,
  useDebouncedValue,
} from "@/lib/hooks/use-debounce";

type ProjectItem = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  updated_at: string;
};

type ProjectListProps = {
  projects: ProjectItem[];
};

export function ProjectList({ projects }: ProjectListProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(q) ||
        (project.description?.toLowerCase().includes(q) ?? false) ||
        project.status.toLowerCase().includes(q)
    );
  }, [projects, debouncedQuery]);

  return (
    <div className="space-y-3">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search projects…"
        aria-label="Search projects"
      />
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No projects match your search.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {filtered.map((project) => (
            <ProjectListRow key={project.id} project={project} />
          ))}
        </ul>
      )}
    </div>
  );
}
