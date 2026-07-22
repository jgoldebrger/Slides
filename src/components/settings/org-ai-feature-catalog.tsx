"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  getOrgAiFeatureCatalog,
  setOrgAiFeatureEnabled,
} from "@/lib/actions/ai-platform";
import { groupCoreFeatures } from "@/lib/ai/feature-labels";
import { LoadingState } from "@/components/shared/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type CatalogFeature = {
  id: string;
  label: string;
  enabled: boolean;
  orgOverride: boolean;
};

type FilterMode = "all" | "enabled" | "disabled";

export function OrgAiFeatureCatalog() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [coreFeatures, setCoreFeatures] = useState<CatalogFeature[]>([]);
  const [stats, setStats] = useState({ coreEnabled: 0, coreTotal: 0 });

  async function load() {
    setLoading(true);
    const data = await getOrgAiFeatureCatalog();
    setCoreFeatures(data.coreFeatures);
    setStats(data.stats);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = coreFeatures.filter((feature) => {
      if (filter === "enabled" && !feature.enabled) return false;
      if (filter === "disabled" && feature.enabled) return false;
      if (!query) return true;
      return (
        feature.label.toLowerCase().includes(query) ||
        feature.id.toLowerCase().includes(query)
      );
    });
    const allowed = new Set(filtered.map((f) => f.id));
    const byId = new Map(filtered.map((f) => [f.id, f]));

    return groupCoreFeatures()
      .map((group) => ({
        ...group,
        features: group.features
          .filter((id) => allowed.has(id))
          .map((id) => byId.get(id))
          .filter((f): f is CatalogFeature => Boolean(f)),
      }))
      .filter((group) => group.features.length > 0);
  }, [coreFeatures, filter, search]);

  async function handleToggle(feature: CatalogFeature) {
    setSavingId(feature.id);
    const result = await setOrgAiFeatureEnabled(feature.id, !feature.enabled);
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success(
        `${feature.label} ${feature.enabled ? "disabled" : "enabled"}`
      );
      await load();
    }
    setSavingId(null);
  }

  if (loading) {
    return <LoadingState message="Loading feature catalog…" />;
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium">
          Core AI features — {stats.coreEnabled} of {stats.coreTotal} enabled
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Toggle features for your org. Disabled features won&apos;t run in project,
          deck, or settings flows.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "enabled", "disabled"] as const).map((mode) => (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={filter === mode ? "default" : "outline"}
            onClick={() => setFilter(mode)}
          >
            {mode === "all" ? "All" : mode === "enabled" ? "Enabled" : "Disabled"}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="feature-search">Search features</Label>
        <Input
          id="feature-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or id…"
        />
      </div>

      <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
        {filteredGroups.map((group) => (
          <div key={group.id}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.features.map((feature) => (
                <li
                  key={feature.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm",
                    feature.enabled
                      ? "border-success/30 bg-success/5"
                      : "border-border bg-muted/30 opacity-80"
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium">{feature.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {feature.id}
                      {feature.orgOverride ? " · org override" : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium",
                        feature.enabled
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {feature.enabled ? "On" : "Off"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingId === feature.id}
                      onClick={() => void handleToggle(feature)}
                    >
                      {savingId === feature.id
                        ? "…"
                        : feature.enabled
                          ? "Disable"
                          : "Enable"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {filteredGroups.every((g) => g.features.length === 0) && (
          <p className="text-sm text-muted-foreground">No features match your filters.</p>
        )}
      </div>
    </div>
  );
}
