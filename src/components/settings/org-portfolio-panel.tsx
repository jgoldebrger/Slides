"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { getOrgProjectsForPortfolio } from "@/lib/actions/ai-platform";
import { runOrgInsightLibrary, runPortfolioRollup } from "@/lib/actions/ai-features";
import { AiResultPanel } from "@/components/ai/ai-result-panel";
import { EmptyState, LoadingState } from "@/components/shared/state";
import { Button } from "@/components/ui/button";

export function OrgPortfolioPanel() {
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [output, setOutput] = useState<unknown>(null);
  const [outputTitle, setOutputTitle] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setCatalogLoading(true);
      const result = await getOrgProjectsForPortfolio();
      if ("projects" in result) {
        setProjects(result.projects);
      }
      setCatalogLoading(false);
    })();
  }, []);

  function toggle(id: string) {
    setProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleRollup() {
    setLoading(true);
    const result = await runPortfolioRollup(projectIds);
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success("Portfolio rollup ready");
      setOutputTitle("Portfolio rollup");
      setOutput("outline" in result ? result.outline : result);
    }
    setLoading(false);
  }

  async function handleInsights() {
    setLoading(true);
    const result = await runOrgInsightLibrary();
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success("Insight patterns extracted");
      setOutputTitle("Insight library");
      setOutput("patterns" in result ? result.patterns : result);
    }
    setLoading(false);
  }

  if (catalogLoading) {
    return <LoadingState message="Loading projects…" />;
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div>
        <h3 className="font-medium">Org memory</h3>
        <p className="text-xs text-muted-foreground">
          Portfolio rollup and insight library across projects.
        </p>
      </div>
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create projects to run portfolio rollup and insight extraction."
        />
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
          {projects.map((project) => (
            <li key={project.id}>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={projectIds.includes(project.id)}
                  onChange={() => toggle(project.id)}
                />
                {project.name}
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={loading || projectIds.length < 2}
          onClick={() => void handleRollup()}
        >
          Portfolio rollup
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={loading || projects.length === 0}
          onClick={() => void handleInsights()}
        >
          Insight library
        </Button>
      </div>
      {output != null ? <AiResultPanel data={output} title={outputTitle ?? undefined} /> : null}
    </div>
  );
}
