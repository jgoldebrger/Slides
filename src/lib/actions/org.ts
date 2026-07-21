"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ACTIVE_ORG_COOKIE, listUserOrgs } from "@/lib/org-context";
import { requireUser } from "@/lib/permissions";

export async function getOrganizations() {
  await requireUser();
  return listUserOrgs();
}

export async function switchOrganization(orgId: string) {
  const orgs = await listUserOrgs();
  if (!orgs.some((org) => org.id === orgId)) {
    return { error: "Organization not found" };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
  return { success: true };
}
