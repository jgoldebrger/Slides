import { redirect } from "next/navigation";
import { getUserOrg, requireDeckAccess } from "@/lib/permissions";
import { isViewerRole } from "@/lib/roles";

export async function getOrgContext() {
  const ctx = await getUserOrg();
  return { ...ctx, isViewer: isViewerRole(ctx.role) };
}

export async function redirectIfViewer(fallback = "/decks") {
  const { role } = await getUserOrg();
  if (isViewerRole(role)) redirect(fallback);
}

/** Use the deck's org membership role — not the active-org cookie alone. */
export async function redirectViewerFromDeckEdit(deckId: string) {
  const { role } = await requireDeckAccess(deckId);
  if (isViewerRole(role)) redirect(`/decks/${deckId}/player`);
}
