import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { getOrgContext } from "@/lib/viewer-guard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { orgId, isViewer, orgName, user } = await getOrgContext();
  if (isViewer) redirect("/decks");

  const supabase = await createClient();

  const [
    { count: projectCount },
    { count: deckCount },
    { count: readyDeckCount },
    { data: recentDecks },
    { data: recentProjects },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("decks")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("decks")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "ready"),
    supabase
      .from("decks")
      .select("id, name, status, type, updated_at, projects(name)")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("projects")
      .select("id, name, status, updated_at")
      .eq("org_id", orgId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  return (
    <DashboardHome
      displayName={profile?.display_name ?? ""}
      orgName={orgName}
      projectCount={projectCount ?? 0}
      deckCount={deckCount ?? 0}
      readyDeckCount={readyDeckCount ?? 0}
      recentDecks={(recentDecks ?? []).map((deck) => {
        const raw = deck.projects as { name: string } | { name: string }[] | null;
        const project = Array.isArray(raw) ? raw[0] : raw;
        return {
          id: deck.id,
          name: deck.name,
          status: deck.status,
          type: deck.type,
          updatedAt: deck.updated_at,
          projectName: project?.name,
        };
      })}
      recentProjects={(recentProjects ?? []).map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        updatedAt: project.updated_at,
      }))}
    />
  );
}
