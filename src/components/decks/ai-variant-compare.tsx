"use client";

import { useState } from "react";
import { GitCompare } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  applyOutlineVariant,
  storeOutlineVariants,
} from "@/lib/actions/ai-workspace";
import { Button } from "@/components/ui/button";

type Variant = {
  strategy: string;
  outline: { slides?: Array<{ title: string; layout: string }> };
};

type AiVariantCompareProps = {
  deckId: string;
  initialVariants?: Variant[];
  onApplied?: () => void;
};

export function AiVariantCompare({
  deckId,
  initialVariants = [],
  onApplied,
}: AiVariantCompareProps) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    const result = await storeOutlineVariants(deckId);
    const err = getActionError(result);
    if (err) toast.error(err);
    else if ("variants" in result) {
      setVariants(result.variants as Variant[]);
      toast.success("Variants ready — compare and apply");
    }
    setLoading(false);
  }

  async function handleApply(strategy: string) {
    setLoading(true);
    const result = await applyOutlineVariant(deckId, strategy);
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success(`Applied ${strategy} variant`);
      onApplied?.();
    }
    setLoading(false);
  }

  if (!variants.length) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => void handleGenerate()}
      >
        <GitCompare className="mr-1 h-4 w-4" />
        {loading ? "Generating…" : "Generate & compare variants"}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 font-medium">
          <GitCompare className="h-4 w-4" />
          Outline variants
        </h3>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => void handleGenerate()}
        >
          Regenerate
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {variants.map((v) => (
          <div
            key={v.strategy}
            className={`rounded-md border p-3 ${
              selected === v.strategy
                ? "border-primary bg-primary/5"
                : "border-border"
            }`}
          >
            <p className="mb-2 text-sm font-medium capitalize">
              {v.strategy.replace(/_/g, " ")}
            </p>
            <ul className="mb-3 max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {v.outline.slides?.map((s, i) => (
                <li key={i}>
                  {i + 1}. {s.title} ({s.layout})
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              className="w-full"
              variant={selected === v.strategy ? "default" : "outline"}
              disabled={loading}
              onClick={() => {
                setSelected(v.strategy);
                void handleApply(v.strategy);
              }}
            >
              Apply
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
