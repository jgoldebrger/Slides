"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { listAiConnectors, updateAiConnector } from "@/lib/actions/ai-workspace";
import {
  EntityListPanel,
  EntityListPrimary,
  EntityListRow,
  EntityListTrailing,
} from "@/components/shared/entity-list";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

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
    setSavingId(connector.id);
    const result = await updateAiConnector(connector.connector_type, {
      enabled: connector.enabled,
      name: connector.name,
      config: { webhookUrl: configs[connector.connector_type] ?? "" },
    });
    const err = getActionError(result);
    if (err) toast.error(err);
    else toast.success(`${connector.name} saved`);
    setSavingId(null);
  }

  function toggleEnabled(connector: ConnectorRow) {
    setConnectors((prev) =>
      prev.map((row) =>
        row.id === connector.id ? { ...row, enabled: !row.enabled } : row
      )
    );
  }

  if (connectors.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No connectors configured yet.
      </p>
    );
  }

  return (
    <EntityListPanel>
      {connectors.map((connector) => {
        const expanded = expandedId === connector.id;
        return (
          <EntityListRow
            key={connector.id}
            className="flex-col items-stretch gap-3"
          >
            <div className="flex w-full items-center gap-3">
              <EntityListPrimary
                title={connector.name}
                subtitle={connector.enabled ? "Connected" : "Disabled"}
              />
              <EntityListTrailing>
                <label className="flex items-center gap-1.5 text-xs text-link/80">
                  <input
                    type="checkbox"
                    checked={connector.enabled}
                    onChange={() => toggleEnabled(connector)}
                  />
                  On
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setExpandedId(expanded ? null : connector.id)
                  }
                >
                  {expanded ? "Hide" : "Configure"}
                </Button>
              </EntityListTrailing>
            </div>
            {expanded ? (
              <div className="space-y-2 border-t border-link/15 pt-3">
                <Input
                  value={configs[connector.connector_type] ?? ""}
                  onChange={(e) =>
                    setConfigs((prev) => ({
                      ...prev,
                      [connector.connector_type]: e.target.value,
                    }))
                  }
                  placeholder={`${connector.connector_type} webhook or channel URL`}
                  className="border-link/20 bg-[var(--color-brand-50)]"
                />
                <Button
                  size="sm"
                  disabled={savingId === connector.id}
                  onClick={() => void save(connector)}
                >
                  {savingId === connector.id ? "Saving…" : "Save connector"}
                </Button>
              </div>
            ) : null}
          </EntityListRow>
        );
      })}
    </EntityListPanel>
  );
}
