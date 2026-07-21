"use server";

import { revalidatePath } from "next/cache";
import {
  requireOrgEditor,
  requireProjectAccess,
  assertCanEdit,
} from "@/lib/permissions";
import { projectSchema, projectUpdateSchema, deckSchema } from "@/lib/validations";
import {
  actionError,
  formError,
  toPublicError,
} from "@/lib/errors/public-error";

export async function createProject(formData: FormData) {
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    status: formData.get("status") || "active",
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { supabase, user, orgId } = await requireOrgEditor();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      org_id: orgId,
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return formError(toPublicError(error));

  await supabase.from("project_updates").insert({ project_id: data.id });
  revalidatePath("/projects");
  return { data: { id: data.id } };
}

export async function updateProject(
  projectId: string,
  formData: FormData
) {
  const parsed = projectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    status: formData.get("status") || "active",
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { supabase, role } = await requireProjectAccess(projectId);
  assertCanEdit(role);
  const { error } = await supabase
    .from("projects")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) return formError(toPublicError(error));
  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function saveProjectUpdate(
  projectId: string,
  payload: unknown
) {
  const parsed = projectUpdateSchema.safeParse(payload);
  if (!parsed.success) return { error: "Invalid update data" };

  const { supabase, role } = await requireProjectAccess(projectId);
  assertCanEdit(role);
  const { error } = await supabase
    .from("project_updates")
    .upsert(
      {
        project_id: projectId,
        ...parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id" }
    );

  if (error) return actionError(toPublicError(error));
  revalidatePath(`/projects/${projectId}/updates`);
  return { success: true };
}

export async function uploadScreenshot(
  projectId: string,
  formData: FormData
) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided" };
  if (file.size > 5 * 1024 * 1024) return { error: "File must be under 5MB" };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return { error: "Only PNG, JPEG, and WebP images are allowed" };
  }

  const { supabase, project, role } = await requireProjectAccess(projectId);
  assertCanEdit(role);
  const orgId = project.org_id as string;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const safeName = `${crypto.randomUUID()}.${ext}`;
  const path = `${orgId}/${projectId}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("screenshots")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) return actionError(toPublicError(uploadError, "Upload failed"));

  const { data: existing } = await supabase
    .from("project_updates")
    .select("screenshots")
    .eq("project_id", projectId)
    .single();

  const screenshots = [
    ...((existing?.screenshots as { path: string; caption?: string }[]) ?? []),
    { path, caption: formData.get("caption")?.toString() },
  ];

  await supabase
    .from("project_updates")
    .upsert(
      { project_id: projectId, screenshots, updated_at: new Date().toISOString() },
      { onConflict: "project_id" }
    );

  revalidatePath(`/projects/${projectId}/updates`);
  return { success: true as const, path };
}

export async function createDeck(formData: FormData) {
  const parsed = deckSchema.safeParse({
    project_id: formData.get("project_id"),
    name: formData.get("name"),
    type: formData.get("type"),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { supabase, user, orgId } = await requireOrgEditor();

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, org_id")
    .eq("id", parsed.data.project_id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (projectError) return formError(toPublicError(projectError));
  if (!project) {
    return formError("Project not found in this organization");
  }

  const { data, error } = await supabase
    .from("decks")
    .insert({
      project_id: project.id,
      org_id: orgId,
      name: parsed.data.name,
      type: parsed.data.type,
      status: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return formError(toPublicError(error));
  revalidatePath("/decks");
  return { data: { id: data.id } };
}
