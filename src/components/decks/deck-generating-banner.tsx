"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { getDeckStatus } from "@/lib/actions/decks";
import { Button } from "@/components/ui/button";

type DeckGeneratingBannerProps = {
  deckId: string;
  initialStatus: string;
};

export function DeckGeneratingBanner({
  deckId,
  initialStatus,
}: DeckGeneratingBannerProps) {
  const router = useRouter();
  const [polledStatus, setPolledStatus] = useState<string | null>(null);
  const status = polledStatus ?? initialStatus;

  useEffect(() => {
    if (initialStatus !== "generating") return;

    const interval = setInterval(async () => {
      const result = await getDeckStatus(deckId);
      if (!result.status) return;
      if (result.status === "ready" || result.status === "failed") {
        setPolledStatus(result.status);
        router.refresh();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [deckId, initialStatus, router]);

  if (status === "failed") {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3"
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-destructive" aria-hidden />
          <div>
            <p className="text-sm font-medium text-destructive">
              Slide generation failed
            </p>
            <p className="text-xs text-muted-foreground">
              You can retry from the outline, or restore a previous version in
              the editor.
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href={`/decks/${deckId}/outline`}>Back to outline</Link>
        </Button>
      </div>
    );
  }

  if (status !== "generating") return null;

  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3"
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
      <div>
        <p className="text-sm font-medium">Generating slide content…</p>
        <p className="text-xs text-muted-foreground">
          AI is filling slides from your approved outline. This may take a
          minute.
        </p>
      </div>
    </div>
  );
}
