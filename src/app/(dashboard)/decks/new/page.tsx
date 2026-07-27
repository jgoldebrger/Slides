import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DeckCreateWizard } from "@/components/decks/deck-create-wizard";
import { LoadingState } from "@/components/shared/state";
import { redirectIfViewer } from "@/lib/viewer-guard";
import { getUserOrg } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create deck" };

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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/decks"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Decks
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Create a deck</h1>
        <p className="text-muted-foreground">
          Four simple steps — project, update, name, and we&apos;ll build the slides for you.
        </p>
      </div>
      <Suspense fallback={<LoadingState message="Loading…" />}>
        <DeckCreateWizard projects={projects ?? []} />
      </Suspense>
    </div>
  );
}
