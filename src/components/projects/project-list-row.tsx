"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { ProjectStatusBadge } from "@/components/projects/project-status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EntityListMeta,
  EntityListPrimary,
  EntityListRow,
  EntityListTrailing,
  entityListMenuButtonClass,
  formatListDate,
} from "@/components/shared/entity-list";

type ProjectListRowProps = {
  project: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    updated_at: string;
  };
};

export function ProjectListRow({ project }: ProjectListRowProps) {
  const updatedLabel = formatListDate(project.updated_at);

  return (
    <EntityListRow>
      <EntityListPrimary
        href={`/projects/${project.id}`}
        title={project.name}
        subtitle={
          project.description
            ? project.description
            : `Updated ${updatedLabel}`
        }
      />
      <EntityListTrailing>
        <ProjectStatusBadge status={project.status} />
        {project.description ? (
          <EntityListMeta>{updatedLabel}</EntityListMeta>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={entityListMenuButtonClass}
              aria-label={`Actions for ${project.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}`}>Overview</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}/updates`}>Updates</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/decks/new?project=${project.id}`}>New deck</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </EntityListTrailing>
    </EntityListRow>
  );
}
