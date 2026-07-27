"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Loader2,
  Pin,
  Send,
  Square,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { getDeckChatHistory } from "@/lib/actions/ai-enhancements";
import {
  getCopilotSettings,
  sendCopilotMessage,
  setCopilotMode,
  setPinnedInstructions,
} from "@/lib/actions/ai-workspace";
import { SLASH_COMMANDS } from "@/lib/ai/workspace/copilot";
import { pollAiGeneration } from "@/lib/hooks/poll-ai-generation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { CopilotMode } from "@/lib/ai/workspace/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type DeckCopilotWorkspaceProps = {
  deckId: string;
  slideId?: string;
  onSelectSlide?: (slideId: string) => void;
  onActionsComplete?: () => void;
};

const MODES: { id: CopilotMode; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "edit", label: "Edit" },
  { id: "present", label: "Present" },
  { id: "research", label: "Research" },
];

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Deck Copilot — use @slide-3, /rewrite, /factcheck, or ask in plain language.",
};

export function DeckCopilotWorkspace({
  deckId,
  slideId,
  onSelectSlide,
  onActionsComplete,
}: DeckCopilotWorkspaceProps) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [mode, setMode] = useState<CopilotMode>("edit");
  const [pinned, setPinned] = useState("");
  const [showPinEditor, setShowPinEditor] = useState(false);
  const [toolTraces, setToolTraces] = useState<
    Array<{ action: string; summary: string; at: string }>
  >([]);
  const [pendingDelete, setPendingDelete] = useState<{
    slideOrder: number;
    message: string;
  } | null>(null);
  const abortRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void Promise.all([
      getDeckChatHistory(deckId),
      getCopilotSettings(deckId),
    ]).then(([{ history }, settings]) => {
      if (history?.length) {
        setMessages([WELCOME, ...(history as ChatMessage[])]);
      }
      setMode(settings.mode);
      setPinned(settings.pinnedInstructions);
      setToolTraces(settings.toolTraces);
    });
  }, [deckId]);

  async function handleModeChange(next: CopilotMode) {
    setMode(next);
    const result = await setCopilotMode(deckId, next);
    const err = getActionError(result);
    if (err) toast.error(err);
  }

  async function handleSavePinned() {
    const result = await setPinnedInstructions(deckId, pinned);
    const err = getActionError(result);
    if (err) toast.error(err);
    else {
      toast.success("Pinned instructions saved");
      setShowPinEditor(false);
    }
  }

  function handleStop() {
    abortRef.current = true;
    setSending(false);
    toast.message("Stopped");
  }

  async function handleSend(
    text?: string,
    options?: { confirmDeletes?: boolean }
  ) {
    const message = (text ?? input).trim();
    if (!message || sending) return;

    abortRef.current = false;
    setInput("");
    setSending(true);
    if (!options?.confirmDeletes) {
      setMessages((prev) => [...prev, { role: "user", content: message }]);
    }

    try {
      const result = await sendCopilotMessage(deckId, message, {
        confirmDeletes: options?.confirmDeletes,
        slideId,
      });
      if (abortRef.current) return;

      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: actionError },
        ]);
        return;
      }

      if (!("reply" in result)) return;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply },
      ]);
      if (result.suggestions) setSuggestions(result.suggestions);

      if (result.pendingDelete?.slideOrder !== undefined) {
        setPendingDelete({
          slideOrder: result.pendingDelete.slideOrder,
          message,
        });
        return;
      }

      if (result.selectSlideId && onSelectSlide) {
        onSelectSlide(result.selectSlideId);
      }

      if (result.generationIds?.length) {
        toast.message("Running AI actions…");
        await Promise.all(
          result.generationIds.map((id) => pollAiGeneration(deckId, id))
        );
      }

      const settings = await getCopilotSettings(deckId);
      setToolTraces(settings.toolTraces);

      onActionsComplete?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Copilot failed";
      toast.error(msg);
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
    } finally {
      setSending(false);
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Bot className="h-4 w-4" aria-hidden />
          Deck Copilot
        </span>
        <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
          <div className="flex flex-wrap gap-1">
            {MODES.map((m) => (
              <Button
                key={m.id}
                type="button"
                size="sm"
                variant={mode === m.id ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => void handleModeChange(m.id)}
              >
                {m.label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setShowPinEditor((v) => !v)}
            >
              <Pin className="mr-1 h-3 w-3" />
              Pin
            </Button>
          </div>

          {showPinEditor && (
            <div className="space-y-2">
              <Textarea
                value={pinned}
                onChange={(e) => setPinned(e.target.value)}
                placeholder="Standing instructions for this deck…"
                rows={2}
                className="text-xs"
              />
              <Button size="sm" onClick={() => void handleSavePinned()}>
                Save instructions
              </Button>
            </div>
          )}

          <div
            ref={listRef}
            className="max-h-52 space-y-2 overflow-y-auto rounded-md border border-border bg-background p-2"
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-md px-2 py-1.5 text-xs",
                  msg.role === "user"
                    ? "ml-6 bg-primary/10 text-foreground"
                    : "mr-6 bg-muted text-muted-foreground"
                )}
              >
                {msg.content}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Thinking…
              </div>
            )}
          </div>

          {toolTraces.length > 0 && (
            <div className="rounded-md border border-border bg-background p-2">
              <p className="mb-1 text-xs font-medium">Tool traces</p>
              <ul className="max-h-20 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
                {toolTraces.slice(-5).map((t, i) => (
                  <li key={`${t.at}-${i}`}>
                    {t.action}: {t.summary}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {(suggestions.length ? suggestions : Object.keys(SLASH_COMMANDS)).map(
              (s) => (
                <Button
                  key={s}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={sending}
                  onClick={() => void handleSend(s)}
                >
                  {s}
                </Button>
              )
            )}
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="@slide-2 /rewrite make shorter"
              disabled={sending}
              aria-label="Copilot message"
            />
            {sending ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleStop}
                aria-label="Stop generation"
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </form>
        </div>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(next) => !next && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete slide {pendingDelete?.slideOrder}?</DialogTitle>
            <DialogDescription>
              Confirm to proceed with deletion from copilot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDelete(null)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={sending}
              onClick={() => {
                if (!pendingDelete) return;
                const msg = pendingDelete.message;
                setPendingDelete(null);
                void handleSend(msg, { confirmDeletes: true });
              }}
            >
              Delete slide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
