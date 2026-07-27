"use client";

import { useEffect, useState } from "react";
import { Plug } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { listAiConnectors, updateAiConnector } from "@/lib/actions/ai-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ConnectorType } from "@/lib/ai/workspace/types";

type ConnectorRow = {
  id: string;
  connector_type: ConnectorType;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
};

export function AiConnectorsPanel() {
  const [connectors, setConnectors] = useState<ConnectorRow[]>([]);
  const [configs, setConfigs] = useState<Record<string, string>>({});

  async function load() {
    const result = await listAiConnectors();
    if ("connectors" in result) {
      const rows = result.connectors as ConnectorRow[];
      setConnectors(rows);
      const next: Record<string, string> = {};
      for (const c of rows) {
        next[c.connector_type] = String(
          (c.config as { webhookUrl?: string })?.webhookUrl ?? ""
        );
      }
      setConfigs(next);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(connector: ConnectorRow) {
    const result = await updateAiConnector(connector.connector_type, {
      enabled: connector.enabled,
      name: connector.name,
      config: { webhookUrl: configs[connector.connector_type] ?? "" },
    });
    const err = getActionError(result);
    if (err) toast.error(err);
    else toast.success(`${connector.name} saved`);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Connect intake sources. Paste webhook URLs or API keys (stored per org).
      </p>
      {connectors.map((c) => (
        <div
          key={c.id}
          className="rounded-lg border border-border bg-card p-4"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-medium">
              <Plug className="h-4 w-4" />
              {c.name}
            </h3>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={() =>
                  setConnectors((prev) =>
                    prev.map((row) =>
                      row.id === c.id ? { ...row, enabled: !row.enabled } : row
                    )
                  )
                }
              />
              Enabled
            </label>
          </div>
          <Input
            value={configs[c.connector_type] ?? ""}
            onChange={(e) =>
              setConfigs((prev) => ({
                ...prev,
                [c.connector_type]: e.target.value,
              }))
            }
            placeholder={`${c.connector_type} webhook or channel URL`}
            className="mb-2"
          />
          <Button size="sm" onClick={() => void save(c)}>
            Save connector
          </Button>
        </div>
      ))}
    </div>
  );
}
