"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  getOrgAiFeatureCatalog,
  setOrgAiFeatureEnabled,
} from "@/lib/actions/ai-platform";
import {
  getFeatureDescription,
  getFeatureGroupDescription,
  groupCoreFeatures,
} from "@/lib/ai/feature-labels";
import {
  EntityListPanel,
  EntityListPrimary,
  EntityListRow,
  EntityListSearchToolbar,
  EntityListTrailing,
} from "@/components/shared/entity-list";
import { LoadingState } from "@/components/shared/state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CatalogFeature = {
  id: string;
  label: string;
  enabled: boolean;
  orgOverride: boolean;
};

type FilterMode = "all" | "enabled" | "disabled";

function FeatureGroupSection({
  groupId,
  label,
  features,
  open,
  onToggle,
  savingId,
  onToggleFeature,
}: {
  groupId: string;
  label: string;
  features: CatalogFeature[];
  open: boolean;
  onToggle: () => void;
  savingId: string | null;
  onToggleFeature: (feature: CatalogFeature) => void;
}) {
  const enabledCount = features.filter((f) => f.enabled).length;
  const description = getFeatureGroupDescription(groupId);

  return (
    <div className="overflow-hidden rounded-lg border border-link/20">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 bg-link/5 px-4 py-3 text-left transition-colors hover:bg-link/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-link transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <span className="rounded bg-link/15 px-2 py-0.5 text-xs font-medium text-link">
              {enabledCount}/{features.length} on
            </span>
          </span>
          {description ? (
            <span className="mt-1 block text-xs text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>
      </button>

      {open ? (
        <EntityListPanel className="rounded-none border-0 border-t border-link/15">
          {features.map((feature) => (
            <EntityListRow key={feature.id}>
              <EntityListPrimary
                title={feature.label}
                subtitle={
                  feature.orgOverride
                    ? `${getFeatureDescription(feature.id)} · Custom org setting`
                    : getFeatureDescription(feature.id)
                }
              />
              <EntityListTrailing>
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium",
                    feature.enabled
                      ? "bg-link/15 text-link"
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
                  onClick={() => onToggleFeature(feature)}
                >
                  {savingId === feature.id
                    ? "…"
                    : feature.enabled
                      ? "Disable"
                      : "Enable"}
                </Button>
              </EntityListTrailing>
            </EntityListRow>
          ))}
        </EntityListPanel>
      ) : null}
    </div>
  );
}

export function OrgAiFeatureCatalog() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [coreFeatures, setCoreFeatures] = useState<CatalogFeature[]>([]);
  const [stats, setStats] = useState({ coreEnabled: 0, coreTotal: 0 });
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

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
      const description = getFeatureDescription(feature.id).toLowerCase();
      return (
        feature.label.toLowerCase().includes(query) ||
        feature.id.toLowerCase().includes(query) ||
        description.includes(query)
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

  const totalVisible = filteredGroups.reduce(
    (sum, group) => sum + group.features.length,
    0
  );

  const isFiltering = search.trim().length > 0 || filter !== "all";

  useEffect(() => {
    if (isFiltering) {
      setOpenGroups(new Set(filteredGroups.map((group) => group.id)));
      return;
    }
    setOpenGroups((prev) => {
      if (prev.size > 0) return prev;
      const first = filteredGroups[0]?.id;
      return first ? new Set([first]) : new Set();
    });
  }, [isFiltering, filteredGroups]);

  function toggleGroup(groupId: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

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
    return <LoadingState message="Loading features…" />;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-link/75">
        {stats.coreEnabled} of {stats.coreTotal} features enabled
      </p>

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

      <EntityListSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search features…"
        ariaLabel="Search features"
        countLabel={`${totalVisible} shown`}
      />

      {filteredGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No features match your filters.</p>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
            <FeatureGroupSection
              key={group.id}
              groupId={group.id}
              label={group.label}
              features={group.features}
              open={openGroups.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
              savingId={savingId}
              onToggleFeature={(feature) => void handleToggle(feature)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
