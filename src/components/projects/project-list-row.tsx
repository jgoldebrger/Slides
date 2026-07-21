"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ProjectListRowProps = {
  project: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
  };
};

export function ProjectListRow({ project }: ProjectListRowProps) {
  return (
    <li className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-muted/60">
      <Link href={`/projects/${project.id}`} className="min-w-0 flex-1">
        <p className="font-medium">{project.name}</p>
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {project.description}
          </p>
        )}
      </Link>
      <div className="flex items-center gap-2">
        <span className="hidden text-xs capitalize text-muted-foreground sm:inline">
          {project.status}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
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
      </div>
    </li>
  );
}
