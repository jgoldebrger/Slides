import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import {
  EntityListMeta,
  EntityListPanel,
  EntityListPrimary,
  EntityListRow,
  EntityListTrailing,
  formatListDate,
} from "@/components/shared/entity-list";
import { PromptLibraryPanel } from "@/components/ai/prompt-library-panel";
import { AiActivityTimeline } from "@/components/decks/ai-activity-timeline";
import { listOrgAiHistory } from "@/lib/actions/ai-workspace";
import { getOrgContext } from "@/lib/viewer-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "AI History" };

export default async function AiHistoryPage() {
  const { isViewer } = await getOrgContext();
  if (isViewer) redirect("/decks");

  const { activity, generations, feedback } = await listOrgAiHistory({
    limit: 30,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="AI History"
        description="Browse AI activity, generations, and feedback across your workspace."
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Last 30 AI actions</CardDescription>
        </CardHeader>
        <CardContent>
          <AiActivityTimeline entries={activity} className="border-0 bg-transparent" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generations</CardTitle>
          <CardDescription>Token usage and job status</CardDescription>
        </CardHeader>
        <CardContent>
          {generations.length ? (
            <EntityListPanel className="border-0 bg-transparent">
              {generations.map((g) => (
                <EntityListRow key={g.id}>
                  <EntityListPrimary
                    title={`${g.model} · ${g.status}`}
                    subtitle={
                      g.deck_id ? `Deck ${g.deck_id.slice(0, 8)}…` : undefined
                    }
                  />
                  <EntityListTrailing>
                    <EntityListMeta className="inline">
                      {g.tokens ?? 0} tok · {formatListDate(g.created_at)}
                    </EntityListMeta>
                  </EntityListTrailing>
                </EntityListRow>
              ))}
            </EntityListPanel>
          ) : (
            <p className="text-sm text-muted-foreground">No generations yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          {feedback.length ? (
            <EntityListPanel className="border-0 bg-transparent">
              {feedback.map((f) => (
                <EntityListRow key={f.id}>
                  <EntityListPrimary
                    title={`${f.rating === 1 ? "Helpful" : "Not helpful"} · ${f.feature_id ?? "general"}`}
                  />
                  <EntityListTrailing>
                    <EntityListMeta className="inline">
                      {formatListDate(f.created_at)}
                    </EntityListMeta>
                  </EntityListTrailing>
                </EntityListRow>
              ))}
            </EntityListPanel>
          ) : (
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompt library</CardTitle>
          <CardDescription>Save and reuse prompts</CardDescription>
        </CardHeader>
        <CardContent>
          <PromptLibraryPanel listClassName="border-0 bg-transparent" />
        </CardContent>
      </Card>
    </div>
  );
}
