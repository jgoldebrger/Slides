"use client";



import { useCallback, useEffect, useState } from "react";

import { toast } from "sonner";

import { captureEvent } from "@/components/analytics/posthog-provider";

import { getActionError } from "@/lib/action-result";

import { getExportDownloadUrl, getExportStatus, startExport } from "@/lib/actions/export";

import { ApplyBrandingToggle } from "@/components/decks/apply-branding-toggle";

import { Button } from "@/components/ui/button";

import {

  Card,

  CardContent,

  CardDescription,

  CardHeader,

  CardTitle,

} from "@/components/ui/card";



type ExportPanelProps = {

  deckId: string;

  deckName: string;

  applyBranding: boolean;

  latestExport: {

    id: string;

    status: string;

    created_at: string;

  } | null;

};



export function ExportPanel({

  deckId,

  deckName,

  applyBranding,

  latestExport,

}: ExportPanelProps) {

  const [exporting, setExporting] = useState(

    latestExport?.status === "processing" || latestExport?.status === "pending"

  );

  const [exportId, setExportId] = useState<string | null>(latestExport?.id ?? null);

  const [status, setStatus] = useState(latestExport?.status ?? "");



  const pollExport = useCallback(async (id: string) => {

    const result = await getExportStatus(id);

    if (!("status" in result) || !result.status) return false;

    setStatus(result.status ?? "");

    if (result.status === "completed") {

      setExporting(false);

      captureEvent("export_completed", { deck_id: deckId, export_id: id });

      toast.success("Export completed");

      return true;

    }

    if (result.status === "failed") {

      setExporting(false);

      toast.error(
        ("error" in result && typeof result.error === "string"
          ? result.error
          : null) ?? "Export failed"
      );

      return true;

    }

    return false;

  }, [deckId]);



  useEffect(() => {

    if (!exporting || !exportId) return;



    const interval = setInterval(async () => {

      const done = await pollExport(exportId);

      if (done) clearInterval(interval);

    }, 2000);



    return () => clearInterval(interval);

  }, [exporting, exportId, pollExport]);

  async function handleExport() {

    setExporting(true);

    const result = await startExport(deckId);

    const actionError = getActionError(result);

    if (actionError) {

      toast.error(actionError);

      setExporting(false);

      return;

    }



    if ("exportId" in result && result.exportId) {

      setExportId(result.exportId);

      setStatus(("status" in result && result.status) || "processing");

      toast.info("Export started…");

      const done = await pollExport(result.exportId);

      if (!done) {

        // polling continues via useEffect

      }

    }

  }



  async function handleDownload() {

    if (!exportId) return;

    const result = await getExportDownloadUrl(exportId);

    const actionError = getActionError(result);

    if (actionError) {

      toast.error(actionError);

      return;

    }

    if ("url" in result && result.url) {

      window.open(result.url, "_blank");

    }

  }



  return (

    <Card>

      <CardHeader>

        <CardTitle>Export to PowerPoint</CardTitle>

        <CardDescription>

          Generate a PPTX file for <strong>{deckName}</strong>.

          {applyBranding

            ? " Brand kit colors and logo will be applied."

            : " Neutral styling — brand kit will not be applied."}

        </CardDescription>

      </CardHeader>

      <CardContent className="space-y-4">

        <ApplyBrandingToggle deckId={deckId} initialValue={applyBranding} />



        <Button
          data-testid="start-export"
          onClick={handleExport}
          disabled={exporting}
        >

          {exporting ? "Exporting…" : "Start export"}

        </Button>



        {exporting && (

          <p className="text-sm text-muted-foreground" role="status">

            Building your PowerPoint file in the background…

          </p>

        )}



        {exportId && status === "completed" && (

          <div className="rounded-lg border border-border bg-muted/40 p-4">

            <p className="text-sm text-muted-foreground">Your export is ready.</p>

            <Button variant="outline" className="mt-3" onClick={handleDownload}>

              Download PPTX

            </Button>

          </div>

        )}



        {status === "failed" && (
          <div className="space-y-3">
            <p className="text-sm text-destructive" role="alert">
              The last export failed. Try again.
            </p>
            <Button variant="outline" onClick={handleExport}>
              Try again
            </Button>
          </div>
        )}

      </CardContent>

    </Card>

  );

}

