import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
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
          <AiActivityTimeline entries={activity} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generations</CardTitle>
          <CardDescription>Token usage and job status</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border text-sm">
            {generations.map((g) => (
              <li key={g.id} className="flex justify-between py-2">
                <span>
                  {g.model} · {g.status}
                  {g.deck_id ? ` · deck ${g.deck_id.slice(0, 8)}…` : ""}
                </span>
                <span className="text-muted-foreground">
                  {g.tokens ?? 0} tok ·{" "}
                  {new Date(g.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
            {!generations.length && (
              <li className="py-4 text-muted-foreground">No generations yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border text-sm">
            {feedback.map((f) => (
              <li key={f.id} className="flex justify-between py-2">
                <span>
                  {f.rating === 1 ? "👍" : "👎"}{" "}
                  {f.feature_id ?? "general"}
                </span>
                <span className="text-muted-foreground">
                  {new Date(f.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
            {!feedback.length && (
              <li className="py-4 text-muted-foreground">No feedback yet.</li>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prompt library</CardTitle>
          <CardDescription>Save and reuse prompts</CardDescription>
        </CardHeader>
        <CardContent>
          <PromptLibraryPanel />
        </CardContent>
      </Card>
    </div>
  );
}
