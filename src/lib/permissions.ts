import { createClient } from "@/lib/supabase/server";
import { resolveActiveOrgId } from "@/lib/org-context";
import { canEditOrg, canManageTeam } from "@/lib/roles";

export class PermissionError extends Error {
  constructor(message = "Access denied") {
    super(message);
    this.name = "PermissionError";
  }
}

export function assertCanEdit(role: string) {
  if (!canEditOrg(role)) {
    throw new PermissionError("View-only access");
  }
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new PermissionError("Authentication required");
  return { supabase, user };
}

export async function requireOrgMember(orgId: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single();
  if (error || !data) throw new PermissionError("Not a member of this organization");
  return { supabase, user, role: data.role as string };
}

export async function getUserOrg() {
  const { supabase, user, orgId, orgName, role } = await resolveActiveOrgId();
  return { supabase, user, orgId, orgName, role };
}

export async function requireProjectAccess(projectId: string) {
  const { supabase, user } = await requireUser();
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) throw new PermissionError("Project not found");

  const { role } = await requireOrgMember(project.org_id);
  return { supabase, user, project, role };
}

export async function requireOrgEditor() {
  const ctx = await getUserOrg();
  assertCanEdit(ctx.role);
  return ctx;
}

export async function requireOrgAdmin() {
  const ctx = await getUserOrg();
  if (!canManageTeam(ctx.role)) {
    throw new PermissionError("Admin access required");
  }
  return ctx;
}

export async function requireDeckAccess(deckId: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .single();
  if (error || !data) throw new PermissionError("Deck not found");
  const { role } = await requireOrgMember(data.org_id);
  return { supabase, user, deck: data, role };
}

export async function requireDeckEdit(deckId: string) {
  const result = await requireDeckAccess(deckId);
  assertCanEdit(result.role);
  return result;
}
