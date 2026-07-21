import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NewDeckForm } from "@/components/decks/new-deck-form";
import { LoadingState } from "@/components/shared/state";
import { redirectIfViewer } from "@/lib/viewer-guard";
import { getUserOrg } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New deck" };

export default async function NewDeckPage() {
  await redirectIfViewer();
  const { orgId } = await getUserOrg();
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("org_id", orgId)
    .order("name");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link
          href="/decks"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Decks
        </Link>
        <h1 className="mt-2 text-xl font-semibold">New deck</h1>
        <p className="text-muted-foreground">
          Create a presentation deck from a project&apos;s updates.
        </p>
      </div>
      <Suspense fallback={<LoadingState message="Loading form…" />}>
        <NewDeckForm projects={projects ?? []} />
      </Suspense>
    </div>
  );
}
