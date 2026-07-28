import { redirect } from "next/navigation";
import { canManageTeam } from "@/lib/roles";
import { getOrgContext } from "@/lib/viewer-guard";

export async function requireSettingsAccess() {
  const ctx = await getOrgContext();
  if (ctx.isViewer) redirect("/decks");
  return ctx;
}

export async function requireSettingsAdmin() {
  const ctx = await requireSettingsAccess();
  if (!canManageTeam(ctx.role)) redirect("/settings/account");
  return ctx;
}
