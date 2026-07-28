"use client";

import { useMemo, useState } from "react";
import { ProjectListRow } from "@/components/projects/project-list-row";
import {
  EntityListEmpty,
  EntityListPanel,
  EntityListSearchToolbar,
} from "@/components/shared/entity-list";
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

  const countLabel = `${filtered.length} project${filtered.length === 1 ? "" : "s"}`;

  return (
    <div className="space-y-4">
      <EntityListSearchToolbar
        value={query}
        onChange={setQuery}
        placeholder="Search projects…"
        ariaLabel="Search projects"
        countLabel={countLabel}
      />

      {filtered.length === 0 ? (
        <EntityListEmpty message="No projects match your search." />
      ) : (
        <EntityListPanel>
          {filtered.map((project) => (
            <ProjectListRow key={project.id} project={project} />
          ))}
        </EntityListPanel>
      )}
    </div>
  );
}
