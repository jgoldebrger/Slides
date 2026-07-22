"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  listAiAddons,
  runDeckAddon,
  runOrgAddon,
  runProjectAddon,
} from "@/lib/actions/ai-addons";
import { setOrgAiFeatureEnabled } from "@/lib/actions/ai-platform";
import { AiResultPanel } from "@/components/ai/ai-result-panel";
import {
  type AiAddonCluster,
  type AiAddonFeatureId,
} from "@/lib/ai/addons/catalog";
import { LoadingState } from "@/components/shared/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AiAddonsHubProps = {
  deckId?: string;
  projectId?: string;
  scope?: "deck" | "project" | "org";
};

type AddonRow = {
  id: string;
  num: number;
  cluster: AiAddonCluster;
  label: string;
  enabled: boolean;
  orgOverride: boolean;
};

const CLUSTER_LABELS: Record<AiAddonCluster, string> = {
  G: "Intake",
  H: "Narrative",
  I: "Viz",
  J: "Editor",
  K: "Present",
  L: "Org",
  M: "Trust",
  N: "Integrations",
  O: "Delight",
};

const SCOPE_CLUSTERS: Record<NonNullable<AiAddonsHubProps["scope"]>, AiAddonCluster[]> = {
  project: ["G"],
  deck: ["H", "I", "J", "K", "M"],
  org: ["L", "M", "N"],
};

type AddonFilter = "all" | "enabled" | "disabled";

export function AiAddonsHub({
  deckId,
  projectId,
  scope = "deck",
}: AiAddonsHubProps) {
  const allowedClusters = SCOPE_CLUSTERS[scope];
  const [cluster, setCluster] = useState<AiAddonCluster>(allowedClusters[0]);
  const [search, setSearch] = useState("");
  const [addonFilter, setAddonFilter] = useState<AddonFilter>("all");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [top12, setTop12] = useState<AiAddonFeatureId[]>([]);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [stats, setStats] = useState({ enabled: 0, total: 0 });
  const [output, setOutput] = useState<unknown>(null);

  async function loadCatalog() {
    setCatalogLoading(true);
    const data = await listAiAddons();
    const scoped = data.addons.filter((addon) =>
      allowedClusters.includes(addon.cluster)
    );
    setTop12(
      (data.top12 as AiAddonFeatureId[]).filter((id) =>
        scoped.some((addon) => addon.id === id)
      )
    );
    setAddons(scoped);
    setStats({
      enabled: scoped.filter((a) => a.enabled).length,
      total: scoped.length,
    });
    setCatalogLoading(false);
  }

  useEffect(() => {
    void loadCatalog();
  }, [allowedClusters.join(",")]);

  const clusterAddons = useMemo(() => {
    const query = search.trim().toLowerCase();
    return addons
      .filter((addon) => addon.cluster === cluster)
      .filter((addon) => {
        if (addonFilter === "enabled" && !addon.enabled) return false;
        if (addonFilter === "disabled" && addon.enabled) return false;
        if (!query) return true;
        return (
          addon.label.toLowerCase().includes(query) ||
          addon.id.toLowerCase().includes(query)
        );
      });
  }, [addons, cluster, search, addonFilter]);

  const top12Meta = useMemo(
    () => addons.filter((addon) => top12.includes(addon.id as AiAddonFeatureId)),
    [addons, top12]
  );

  async function runAddon(featureId: AiAddonFeatureId, label: string, enabled: boolean) {
    if (!enabled) {
      toast.error(`${label} is disabled for your org. Enable it first.`);
      return;
    }

    setLoading(featureId);
    let result;
    if (scope === "org") {
      result = await runOrgAddon(featureId, text || undefined);
    } else if (scope === "project" && projectId) {
      result = await runProjectAddon(projectId, featureId, text);
    } else if (deckId) {
      result = await runDeckAddon(deckId, featureId, { text });
    } else {
      toast.error("No deck or project context");
      setLoading(null);
      return;
    }
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success(`${label} complete`);
      if ("result" in result) setOutput(result.result);
    }
    setLoading(null);
  }

  async function toggleAddon(addon: AddonRow) {
    if (scope !== "org") {
      toast.message("Only org admins can change add-on flags in Settings.");
      return;
    }
    setTogglingId(addon.id);
    const result = await setOrgAiFeatureEnabled(addon.id, !addon.enabled);
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success(`${addon.label} ${addon.enabled ? "disabled" : "enabled"}`);
      await loadCatalog();
    }
    setTogglingId(null);
  }

  if (catalogLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <LoadingState message="Loading add-ons…" />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="font-medium">AI add-ons</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {stats.enabled} of {stats.total} add-ons enabled in this view · clusters{" "}
          {allowedClusters.join(", ")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "enabled", "disabled"] as const).map((mode) => (
          <Button
            key={mode}
            size="sm"
            variant={addonFilter === mode ? "default" : "outline"}
            onClick={() => setAddonFilter(mode)}
          >
            {mode === "all" ? "All" : mode === "enabled" ? "Enabled" : "Disabled"}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="addon-search">Search add-ons</Label>
        <Input
          id="addon-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or id…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="addon-input">Optional input</Label>
        <textarea
          id="addon-input"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Optional input text for this add-on…"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {top12Meta.length > 0 && (
        <div className="space-y-2">
          <Label>Top picks</Label>
          <div className="flex flex-wrap gap-2">
            {top12Meta.map((addon) => (
              <AddonChip
                key={addon.id}
                addon={addon}
                loading={loading === addon.id}
                onRun={() =>
                  void runAddon(addon.id as AiAddonFeatureId, addon.label, addon.enabled)
                }
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1" role="group" aria-label="Add-on clusters">
        {allowedClusters.map((clusterId) => (
          <Button
            key={clusterId}
            size="sm"
            variant={cluster === clusterId ? "default" : "outline"}
            aria-pressed={cluster === clusterId}
            onClick={() => setCluster(clusterId)}
          >
            {clusterId}: {CLUSTER_LABELS[clusterId]}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        {clusterAddons.length === 0 ? (
          <p className="text-sm text-muted-foreground">No add-ons match your search.</p>
        ) : (
          clusterAddons.map((addon) => (
            <div
              key={addon.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2",
                addon.enabled
                  ? "border-success/30 bg-success/5"
                  : "border-border bg-muted/30"
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {addon.num}. {addon.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {addon.id}
                  {addon.orgOverride ? " · org override" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge enabled={addon.enabled} />
                {scope === "org" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={togglingId === addon.id}
                    onClick={() => void toggleAddon(addon)}
                  >
                    {togglingId === addon.id
                      ? "…"
                      : addon.enabled
                        ? "Disable"
                        : "Enable"}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  disabled={loading !== null || !addon.enabled}
                  onClick={() =>
                    void runAddon(addon.id as AiAddonFeatureId, addon.label, addon.enabled)
                  }
                >
                  Run
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {output != null ? <AiResultPanel data={output} title="Result" /> : null}
    </div>
  );
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-xs font-medium",
        enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
      )}
    >
      {enabled ? "On" : "Off"}
    </span>
  );
}

function AddonChip({
  addon,
  loading,
  onRun,
}: {
  addon: AddonRow;
  loading: boolean;
  onRun: () => void;
}) {
  return (
    <Button
      size="sm"
      variant={addon.enabled ? "secondary" : "outline"}
      disabled={loading || !addon.enabled}
      onClick={onRun}
      className="gap-2"
    >
      {addon.label}
      <StatusBadge enabled={addon.enabled} />
    </Button>
  );
}
