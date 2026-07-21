"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, Link2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import {
  createDeckShareLink,
  listDeckShareLinks,
  revokeDeckShareLink,
} from "@/lib/actions/share-links";
import {
  generateShareBlurb,
  getDeckShareBlurb,
  sendDeckShareEmail,
} from "@/lib/actions/ai-enhancements";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ShareLinkRow = {
  id: string;
  label: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type DeckSharePanelProps = {
  deckId: string;
  initialLinks?: ShareLinkRow[];
  initialBlurb?: string | null;
};

export function DeckSharePanel({
  deckId,
  initialLinks = [],
  initialBlurb = null,
}: DeckSharePanelProps) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<ShareLinkRow[]>(initialLinks);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [shareBlurb, setShareBlurb] = useState(initialBlurb ?? "");
  const [generatingBlurb, setGeneratingBlurb] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  async function refreshLinks() {
    const result = await listDeckShareLinks(deckId);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
      return;
    }
    setLinks("links" in result ? (result.links ?? []) : []);
  }

  async function handleCreate() {
    setCreating(true);
    setFreshUrl(null);
    const result = await createDeckShareLink(deckId, {
      label: label.trim() || undefined,
      expiresInDays: 30,
    });
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
    } else {
      toast.success("Share link created — expires in 30 days");
      setFreshUrl("url" in result ? (result.url ?? null) : null);
      setLabel("");
      await refreshLinks();
    }
    setCreating(false);
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  async function handleRevokeConfirm() {
    if (!revokeId) return;
    setRevoking(true);
    const result = await revokeDeckShareLink(deckId, revokeId);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
    } else {
      toast.success("Link revoked");
      if (freshUrl) setFreshUrl(null);
      setRevokeId(null);
      await refreshLinks();
    }
    setRevoking(false);
  }

  async function handleGenerateBlurb() {
    setGeneratingBlurb(true);
    try {
      const result = await generateShareBlurb(deckId);
      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        return;
      }
      if (!("generationId" in result) || !result.generationId) {
        toast.error("Failed to start share blurb");
        return;
      }
      toast.message("Writing share blurb…");
      const { pollAiGeneration } = await import(
        "@/lib/hooks/poll-ai-generation"
      );
      const done = await pollAiGeneration(deckId, result.generationId);
      const blurbResult = done.result as { blurb?: string } | null;
      if (blurbResult?.blurb) {
        setShareBlurb(blurbResult.blurb);
        toast.success("Share blurb ready");
      } else {
        const { blurb } = await getDeckShareBlurb(deckId);
        if (blurb) setShareBlurb(blurb);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Share blurb failed");
    } finally {
      setGeneratingBlurb(false);
    }
  }

  async function handleCopyBlurb() {
    if (!shareBlurb.trim()) return;
    try {
      await navigator.clipboard.writeText(shareBlurb);
      toast.success("Blurb copied");
    } catch {
      toast.error("Could not copy blurb");
    }
  }

  async function handleSendEmail() {
    if (!shareEmail.trim()) {
      toast.error("Enter a recipient email");
      return;
    }
    if (!freshUrl) {
      toast.error("Create a share link first, then send while the URL is visible");
      return;
    }
    setSendingEmail(true);
    const result = await sendDeckShareEmail(deckId, {
      to: shareEmail,
      shareUrl: freshUrl,
      message: shareBlurb,
    });
    const actionError = getActionError(result);
    if (actionError) toast.error(actionError);
    else toast.success("Email sent");
    setSendingEmail(false);
  }

  const activeLinks = links.filter((link) => !link.revoked_at);

  return (
    <div className="rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="deck-share-panel"
        id="deck-share-toggle"
      >
        <span className="text-sm font-medium">Share link</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id="deck-share-panel"
          role="region"
          aria-labelledby="deck-share-toggle"
          className="space-y-3 border-t border-border px-4 pb-4 pt-3"
        >
          <p className="text-xs text-muted-foreground">
            Anyone with the link can view this deck in present mode — no login
            required. New links expire in 30 days.
          </p>

          <div className="space-y-2">
            <Label htmlFor="share-blurb">Email blurb (optional)</Label>
            <textarea
              id="share-blurb"
              rows={4}
              value={shareBlurb}
              onChange={(e) => setShareBlurb(e.target.value)}
              placeholder="AI can draft a short message to send with your share link."
              disabled={generatingBlurb}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={generatingBlurb} onClick={() => void handleGenerateBlurb()}>
                {generatingBlurb ? "Generating…" : "Generate blurb"}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!shareBlurb.trim()} onClick={() => void handleCopyBlurb()}>
                Copy blurb
              </Button>
            </div>
            <div className="flex gap-2 pt-2">
              <Input
                type="email"
                placeholder="Recipient email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                disabled={sendingEmail}
              />
              <Button type="button" size="sm" disabled={sendingEmail || !shareEmail.trim()} onClick={() => void handleSendEmail()}>
                {sendingEmail ? "Sending…" : "Email link"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-label">Label (optional)</Label>
            <Input
              id="share-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Exec review"
              disabled={creating}
            />
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => void handleCreate()}
            disabled={creating}
          >
            <Link2 className="mr-2 h-4 w-4" aria-hidden />
            {creating ? "Creating…" : "Create share link"}
          </Button>

          {freshUrl && (
            <div className="space-y-2 rounded-md border border-border bg-background p-3">
              <Label htmlFor="fresh-share-url" className="text-xs font-medium text-muted-foreground">
                Copy now — the full URL is shown only once
              </Label>
              <div className="flex gap-2">
                <Input
                  id="fresh-share-url"
                  readOnly
                  value={freshUrl}
                  className="text-xs"
                  aria-label="Share link URL"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="min-h-10 min-w-10 shrink-0"
                  onClick={() => void handleCopy(freshUrl)}
                  aria-label={copied ? "Copied" : "Copy share link"}
                >
                  {copied ? (
                    <Check className="h-4 w-4" aria-hidden />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden />
                  )}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Active links
            </p>
            {activeLinks.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No active share links.
              </p>
            ) : (
              <ul className="space-y-2">
                {activeLinks.map((link) => (
                  <li
                    key={link.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {link.label || "Untitled link"}
                      </p>
                      <p className="text-muted-foreground">
                        Expires{" "}
                        {link.expires_at
                          ? new Date(link.expires_at).toLocaleDateString()
                          : "never"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="min-h-10 min-w-10"
                      onClick={() => setRevokeId(link.id)}
                      aria-label="Revoke share link"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <Dialog
        open={revokeId !== null}
        onOpenChange={(next) => {
          if (!next) setRevokeId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke this share link?</DialogTitle>
            <DialogDescription>
              Anyone with this link will lose access immediately. You can create
              a new link afterward.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRevokeId(null)}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleRevokeConfirm()}
              disabled={revoking}
            >
              {revoking ? "Revoking…" : "Revoke link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
