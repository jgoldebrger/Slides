"use server";

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { revalidatePath } from "next/cache";
import { buildMeetingNotesPrompt } from "@/lib/ai/prompts/meeting-notes";
import { buildUpdateNarrativePrompt } from "@/lib/ai/prompts/update-narrative";
import {
  meetingNotesResultSchema,
  updateNarrativeSchema,
} from "@/lib/ai/schemas/project-ai";
import { assertDeckJobEntitlement } from "@/lib/deck-rate-limit";
import { actionError, toPublicError } from "@/lib/errors/public-error";
import { requireProjectAccess, assertCanEdit } from "@/lib/permissions";
import type { ProjectUpdateInput } from "@/lib/validations";

const UPDATE_FIELDS = [
  "goals",
  "progress",
  "completed_work",
  "current_tasks",
  "milestones",
  "metrics",
  "risks",
  "blockers",
  "next_steps",
] as const;

function pickUpdateSnapshot(data: Record<string, unknown>) {
  const snapshot: Record<string, unknown> = {};
  for (const key of UPDATE_FIELDS) {
    snapshot[key] = data[key];
  }
  return snapshot;
}

export async function parseMeetingNotesToUpdate(
  projectId: string,
  notes: string
) {
  const trimmed = notes.trim();
  if (!trimmed) return actionError("Paste meeting notes first");
  if (trimmed.length > 20000) return actionError("Notes are too long");

  const { supabase, project, role } = await requireProjectAccess(projectId);
  try {
    assertCanEdit(role);
  } catch {
    return actionError("You cannot edit this project");
  }

  if (!process.env.OPENAI_API_KEY) {
    return actionError("OPENAI_API_KEY is not configured");
  }

  try {
    await assertDeckJobEntitlement(supabase, project.org_id as string, "generate");

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: meetingNotesResultSchema,
      prompt: buildMeetingNotesPrompt({
        projectName: project.name as string,
        notes: trimmed,
      }),
    });

    return { success: true as const, data: object };
  } catch (err) {
    return actionError(toPublicError(err, "Could not parse meeting notes"));
  }
}

export async function generateUpdateDiffNarrative(projectId: string) {
  const { supabase, project, role } = await requireProjectAccess(projectId);
  try {
    assertCanEdit(role);
  } catch {
    return actionError("You cannot edit this project");
  }

  const { data: row } = await supabase
    .from("project_updates")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (!row) return actionError("Save an update first");

  const metadata = (row.metadata as { previousSnapshot?: Record<string, unknown> }) ?? {};
  const before = metadata.previousSnapshot;
  if (!before) {
    return actionError("No previous snapshot — save twice to compare changes");
  }

  const after = pickUpdateSnapshot(row as Record<string, unknown>);

  if (!process.env.OPENAI_API_KEY) {
    return actionError("OPENAI_API_KEY is not configured");
  }

  try {
    await assertDeckJobEntitlement(supabase, project.org_id as string, "generate");

    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: updateNarrativeSchema,
      prompt: buildUpdateNarrativePrompt({
        projectName: project.name as string,
        before,
        after,
      }),
    });

    return { success: true as const, ...object };
  } catch (err) {
    return actionError(toPublicError(err, "Could not generate narrative"));
  }
}

export async function saveProjectUpdateWithSnapshot(
  projectId: string,
  data: ProjectUpdateInput
) {
  const { supabase, role } = await requireProjectAccess(projectId);
  try {
    assertCanEdit(role);
  } catch {
    return actionError("You cannot edit this project");
  }

  const { data: existing } = await supabase
    .from("project_updates")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  const previousSnapshot = existing
    ? pickUpdateSnapshot(existing as Record<string, unknown>)
    : undefined;

  const metadata = {
    ...((existing?.metadata as Record<string, unknown>) ?? {}),
    ...(previousSnapshot ? { previousSnapshot } : {}),
  };

  const { error } = await supabase.from("project_updates").upsert(
    {
      project_id: projectId,
      ...data,
      metadata,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" }
  );

  if (error) return actionError(toPublicError(error));

  revalidatePath(`/projects/${projectId}/updates`);
  return { success: true as const };
}
