"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
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
  getAddonClusterDescription,
  getAddonDescription,
  groupAddonsByCluster,
} from "@/lib/ai/addon-labels";
import {
  EntityListPanel,
  EntityListPrimary,
  EntityListRow,
  EntityListSearchToolbar,
  EntityListTrailing,
} from "@/components/shared/entity-list";
import {
  type AiAddonCluster,
  type AiAddonFeatureId,
} from "@/lib/ai/addons/catalog";
import { LoadingState } from "@/components/shared/state";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AiAddonsHubProps = {
  deckId?: string;
  projectId?: string;
  scope?: "deck" | "project" | "org";
  /** manage = settings toggles only; hub = run add-ons in context */
  variant?: "hub" | "manage";
};

type AddonRow = {
  id: string;
  num: number;
  cluster: AiAddonCluster;
  label: string;
  enabled: boolean;
  orgOverride: boolean;
};

const SCOPE_CLUSTERS: Record<NonNullable<AiAddonsHubProps["scope"]>, AiAddonCluster[]> = {
  project: ["G"],
  deck: ["H", "I", "J", "K", "M"],
  org: ["L", "M", "N"],
};

type AddonFilter = "all" | "enabled" | "disabled";

function AddonGroupSection({
  clusterId,
  label,
  addons,
  open,
  onToggle,
  togglingId,
  runningId,
  canToggle,
  showRun,
  onToggleAddon,
  onRunAddon,
}: {
  clusterId: AiAddonCluster;
  label: string;
  addons: AddonRow[];
  open: boolean;
  onToggle: () => void;
  togglingId: string | null;
  runningId: string | null;
  canToggle: boolean;
  showRun: boolean;
  onToggleAddon: (addon: AddonRow) => void;
  onRunAddon: (addon: AddonRow) => void;
}) {
  const enabledCount = addons.filter((addon) => addon.enabled).length;
  const description = getAddonClusterDescription(clusterId);

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
              {enabledCount}/{addons.length} on
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
          {addons.map((addon) => (
            <EntityListRow key={addon.id}>
              <EntityListPrimary
                title={addon.label}
                subtitle={
                  addon.orgOverride
                    ? `${getAddonDescription(addon.label, addon.cluster)} · Custom org setting`
                    : getAddonDescription(addon.label, addon.cluster)
                }
              />
              <EntityListTrailing>
                <span
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium",
                    addon.enabled
                      ? "bg-link/15 text-link"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {addon.enabled ? "On" : "Off"}
                </span>
                {canToggle ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={togglingId === addon.id}
                    onClick={() => onToggleAddon(addon)}
                  >
                    {togglingId === addon.id
                      ? "…"
                      : addon.enabled
                        ? "Disable"
                        : "Enable"}
                  </Button>
                ) : null}
                {showRun ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={runningId !== null || !addon.enabled}
                    onClick={() => onRunAddon(addon)}
                  >
                    {runningId === addon.id ? "Running…" : "Run"}
                  </Button>
                ) : null}
              </EntityListTrailing>
            </EntityListRow>
          ))}
        </EntityListPanel>
      ) : null}
    </div>
  );
}

export function AiAddonsHub({
  deckId,
  projectId,
  scope = "deck",
  variant = "hub",
}: AiAddonsHubProps) {
  const isManage = variant === "manage";
  const allowedClusters = SCOPE_CLUSTERS[scope];
  const [search, setSearch] = useState("");
  const [addonFilter, setAddonFilter] = useState<AddonFilter>("all");
  const [text, setText] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [top12, setTop12] = useState<AiAddonFeatureId[]>([]);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [stats, setStats] = useState({ enabled: 0, total: 0 });
  const [output, setOutput] = useState<unknown>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

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

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = addons.filter((addon) => {
      if (addonFilter === "enabled" && !addon.enabled) return false;
      if (addonFilter === "disabled" && addon.enabled) return false;
      if (!query) return true;
      const description = getAddonDescription(
        addon.label,
        addon.cluster
      ).toLowerCase();
      return (
        addon.label.toLowerCase().includes(query) ||
        addon.id.toLowerCase().includes(query) ||
        description.includes(query)
      );
    });

    return groupAddonsByCluster(filtered, allowedClusters);
  }, [addons, addonFilter, search, allowedClusters]);

  const totalVisible = filteredGroups.reduce(
    (sum, group) => sum + group.addons.length,
    0
  );

  const isFiltering = search.trim().length > 0 || addonFilter !== "all";

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

  const top12Meta = useMemo(
    () => addons.filter((addon) => top12.includes(addon.id as AiAddonFeatureId)),
    [addons, top12]
  );

  function toggleGroup(clusterId: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(clusterId)) next.delete(clusterId);
      else next.add(clusterId);
      return next;
    });
  }

  async function runAddon(addon: AddonRow) {
    if (!addon.enabled) {
      toast.error(`${addon.label} is disabled for your org. Enable it first.`);
      return;
    }

    setRunningId(addon.id);
    let result;
    if (scope === "org") {
      result = await runOrgAddon(addon.id as AiAddonFeatureId, text || undefined);
    } else if (scope === "project" && projectId) {
      result = await runProjectAddon(
        projectId,
        addon.id as AiAddonFeatureId,
        text
      );
    } else if (deckId) {
      result = await runDeckAddon(deckId, addon.id as AiAddonFeatureId, {
        text,
      });
    } else {
      toast.error("No deck or project context");
      setRunningId(null);
      return;
    }
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success(`${addon.label} complete`);
      if ("result" in result) setOutput(result.result);
    }
    setRunningId(null);
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
    return <LoadingState message="Loading add-ons…" />;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-link/75">
        {stats.enabled} of {stats.total} add-ons enabled
      </p>

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

      <EntityListSearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search add-ons…"
        ariaLabel="Search add-ons"
        countLabel={`${totalVisible} shown`}
      />

      {!isManage && (
        <>
          <div className="space-y-2">
            <Label htmlFor="addon-input">Optional input</Label>
            <textarea
              id="addon-input"
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Optional context for add-on runs…"
              className="flex w-full rounded-md border border-link/20 bg-[var(--color-brand-50)] px-3 py-2 text-sm"
            />
          </div>

          {top12Meta.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-link/70">
                Quick run
              </p>
              <div className="flex flex-wrap gap-2">
                {top12Meta.map((addon) => (
                  <Button
                    key={addon.id}
                    size="sm"
                    variant={addon.enabled ? "secondary" : "outline"}
                    disabled={runningId === addon.id || !addon.enabled}
                    onClick={() => void runAddon(addon)}
                  >
                    {addon.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      {filteredGroups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No add-ons match your search.</p>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => (
            <AddonGroupSection
              key={group.id}
              clusterId={group.id}
              label={group.label}
              addons={group.addons}
              open={openGroups.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
              togglingId={togglingId}
              runningId={runningId}
              canToggle={scope === "org"}
              showRun={!isManage}
              onToggleAddon={(addon) => void toggleAddon(addon)}
              onRunAddon={(addon) => void runAddon(addon)}
            />
          ))}
        </div>
      )}

      {!isManage && output != null ? (
        <AiResultPanel data={output} title="Result" />
      ) : null}
    </div>
  );
}
