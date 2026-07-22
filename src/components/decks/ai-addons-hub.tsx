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

import { AiResultPanel } from "@/components/ai/ai-result-panel";

import {

  AI_ADDON_CLUSTERS,

  type AiAddonCluster,

  type AiAddonFeatureId,

} from "@/lib/ai/addons/catalog";

import { LoadingState } from "@/components/shared/state";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";



type AiAddonsHubProps = {

  deckId?: string;

  projectId?: string;

  scope?: "deck" | "project" | "org";

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



export function AiAddonsHub({

  deckId,

  projectId,

  scope = "deck",

}: AiAddonsHubProps) {

  const allowedClusters = SCOPE_CLUSTERS[scope];

  const [cluster, setCluster] = useState<AiAddonCluster>(allowedClusters[0]);

  const [search, setSearch] = useState("");

  const [text, setText] = useState("");

  const [loading, setLoading] = useState<string | null>(null);

  const [catalogLoading, setCatalogLoading] = useState(true);

  const [top12, setTop12] = useState<AiAddonFeatureId[]>([]);

  const [addons, setAddons] = useState<

    Array<{ id: string; num: number; cluster: AiAddonCluster; label: string }>

  >([]);

  const [output, setOutput] = useState<unknown>(null);



  useEffect(() => {

    void (async () => {

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

      setCatalogLoading(false);

    })();

  }, [allowedClusters.join(",")]);



  const clusterAddons = useMemo(() => {

    const query = search.trim().toLowerCase();

    return addons

      .filter((addon) => addon.cluster === cluster)

      .filter(

        (addon) =>

          !query ||

          addon.label.toLowerCase().includes(query) ||

          addon.id.toLowerCase().includes(query)

      );

  }, [addons, cluster, search]);



  const top12Meta = useMemo(

    () => addons.filter((addon) => top12.includes(addon.id as AiAddonFeatureId)),

    [addons, top12]

  );



  async function runAddon(featureId: AiAddonFeatureId, label: string) {

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

      if ("result" in result) {

        setOutput(result.result);

      }

    }

    setLoading(null);

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

          Browse {addons.length} add-ons for this context. Use search to narrow results.

        </p>

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

              <Button

                key={addon.id}

                size="sm"

                variant="secondary"

                disabled={loading !== null}

                onClick={() => void runAddon(addon.id as AiAddonFeatureId, addon.label)}

              >

                {addon.label}

              </Button>

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



      <div className="flex flex-wrap gap-2">

        {clusterAddons.length === 0 ? (

          <p className="text-sm text-muted-foreground">No add-ons match your search.</p>

        ) : (

          clusterAddons.map((addon) => (

            <Button

              key={addon.id}

              size="sm"

              variant="outline"

              disabled={loading !== null}

              onClick={() => void runAddon(addon.id as AiAddonFeatureId, addon.label)}

            >

              {addon.num}. {addon.label}

            </Button>

          ))

        )}

      </div>



      {output != null ? <AiResultPanel data={output} title="Result" /> : null}

    </div>

  );

}


