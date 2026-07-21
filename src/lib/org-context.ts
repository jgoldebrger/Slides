import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/permissions";

export const ACTIVE_ORG_COOKIE = "active_org_id";

export type UserOrg = {
  id: string;
  name: string;
  role: string;
};

export async function listUserOrgs(): Promise<UserOrg[]> {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const rawOrg = row.organizations as
        | { id: string; name: string }
        | { id: string; name: string }[]
        | null;
      const org = Array.isArray(rawOrg) ? rawOrg[0] : rawOrg;
      if (!org) return null;
      return { id: org.id, name: org.name, role: row.role as string };
    })
    .filter((org): org is UserOrg => org !== null);
}

export async function resolveActiveOrgId(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string };
  orgId: string;
  orgName: string;
  role: string;
}> {
  const { supabase, user } = await requireUser();
  const orgs = await listUserOrgs();
  if (!orgs.length) throw new Error("No organization found");

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const active =
    orgs.find((org) => org.id === cookieOrgId) ?? orgs[0];

  return {
    supabase,
    user,
    orgId: active.id,
    orgName: active.name,
    role: active.role,
  };
}
