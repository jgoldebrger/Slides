"use client";

import { useEffect, useState } from "react";
import { Bot, Play } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { listAiAgents, runAiAgent, updateAiAgent } from "@/lib/actions/ai-workspace";
import { Button } from "@/components/ui/button";
import type { AgentType } from "@/lib/ai/workspace/types";

type AgentRow = {
  id: string;
  agent_type: AgentType;
  name: string;
  enabled: boolean;
  schedule_cron: string | null;
  budget_runs_per_week: number | null;
};

type RunRow = {
  id: string;
  agent_id: string;
  status: string;
  summary: string | null;
  started_at: string;
};

export function AiAgentsDashboard() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  async function load() {
    const result = await listAiAgents();
    if ("agents" in result) {
      setAgents(result.agents as AgentRow[]);
      setRuns(result.runs as RunRow[]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleAgent(agent: AgentRow) {
    setLoading(agent.id);
    const result = await updateAiAgent(agent.agent_type, {
      enabled: !agent.enabled,
    });
    const err = getActionError(result);
    if (err) toast.error(err);
    else await load();
    setLoading(null);
  }

  async function handleRun(agent: AgentRow) {
    setLoading(agent.id);
    const result = await runAiAgent(agent.agent_type);
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success(`${agent.name} started`);
      await load();
    }
    setLoading(null);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-1.5 font-medium">
                  <Bot className="h-4 w-4" />
                  {agent.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {agent.schedule_cron || "Manual trigger"}
                  {agent.budget_runs_per_week
                    ? ` · ${agent.budget_runs_per_week} runs/wk`
                    : ""}
                </p>
              </div>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={agent.enabled}
                  onChange={() => void toggleAgent(agent)}
                  disabled={loading === agent.id}
                />
                On
              </label>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={loading === agent.id || !agent.enabled}
              onClick={() => void handleRun(agent)}
            >
              <Play className="mr-1 h-3 w-3" />
              Run now
            </Button>
          </div>
        ))}
      </div>

      <div>
        <h3 className="mb-2 font-medium">Recent runs</h3>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {runs.slice(0, 10).map((run) => (
            <li key={run.id} className="flex justify-between gap-2 p-3 text-sm">
              <span>{run.summary ?? run.status}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(run.started_at).toLocaleString()}
              </span>
            </li>
          ))}
          {!runs.length && (
            <li className="p-4 text-sm text-muted-foreground">No runs yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
