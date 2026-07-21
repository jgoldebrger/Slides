"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getExportStatus } from "@/lib/actions/export";
import { Button } from "@/components/ui/button";

type DeckExportBannerProps = {
  deckId: string;
  exportId: string | null;
  initialStatus: string | null;
};

export function DeckExportBanner({
  deckId,
  exportId: initialExportId,
  initialStatus,
}: DeckExportBannerProps) {
  const [exportId] = useState(initialExportId);
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    if (
      !exportId ||
      (status !== "pending" && status !== "processing")
    ) {
      return;
    }

    const interval = setInterval(async () => {
      const result = await getExportStatus(exportId);
      if (!("status" in result) || !result.status) return;
      setStatus(result.status);
      if (result.status === "completed" || result.status === "failed") {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [exportId, status]);

  if (status !== "pending" && status !== "processing") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-raised px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Export in progress…</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={`/decks/${deckId}/export`}>View export</Link>
      </Button>
    </div>
  );
}
