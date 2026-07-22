"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { getDeckChatHistory } from "@/lib/actions/ai-enhancements";
import { sendDeckChatMessage } from "@/lib/actions/deck-chat";
import { pollAiGeneration } from "@/lib/hooks/poll-ai-generation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type DeckChatPanelProps = {
  deckId: string;
  onSelectSlide?: (slideId: string) => void;
  onActionsComplete?: () => void;
};

const SUGGESTIONS = [
  "Add a risks slide",
  "Move slide 3 to position 5",
  "Make slide 2 shorter",
  "Run deck QA",
];

const WELCOME: ChatMessage = {
  role: "assistant",
  content: "Ask me to edit your deck — add slides, rewrite content, reorder, or run QA.",
};

export function DeckChatPanel({
  deckId,
  onSelectSlide,
  onActionsComplete,
}: DeckChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [pendingDelete, setPendingDelete] = useState<{ slideOrder: number; message: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void getDeckChatHistory(deckId).then(({ history }) => {
      if (history?.length) {
        setMessages([WELCOME, ...(history as ChatMessage[])]);
      }
    });
  }, [deckId]);

  async function handleSend(text?: string, options?: { confirmDeletes?: boolean }) {
    const message = (text ?? input).trim();
    if (!message || sending) return;

    setInput("");
    setSending(true);
    if (!options?.confirmDeletes) {
      setMessages((prev) => [...prev, { role: "user", content: message }]);
    }

    try {
      const result = await sendDeckChatMessage(deckId, message, options);
      const actionError = getActionError(result);
      if (actionError) {
        toast.error(actionError);
        setMessages((prev) => [...prev, { role: "assistant", content: actionError }]);
        return;
      }

      if (!("reply" in result)) return;

      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);

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
        await Promise.all(result.generationIds.map((id) => pollAiGeneration(deckId, id)));
      }

      const failed = result.actionResults?.filter((a) => !a.success && !a.pendingConfirmation) ?? [];
      if (failed.length) {
        toast.error(failed.map((f) => f.message).join("; "));
      } else if (result.actionResults?.length) {
        toast.success("Done");
      }

      onActionsComplete?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chat failed";
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
          <MessageSquare className="h-4 w-4" aria-hidden />
          Deck chat
        </span>
        <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
          <div ref={listRef} className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border bg-background p-2">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-md px-2 py-1.5 text-xs",
                  msg.role === "user" ? "ml-6 bg-primary/10 text-foreground" : "mr-6 bg-muted text-muted-foreground"
                )}
              >
                {msg.content}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <Button key={s} type="button" variant="outline" size="sm" className="h-7 text-xs" disabled={sending} onClick={() => void handleSend(s)}>
                {s}
              </Button>
            ))}
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="e.g. add a risks slide after slide 3" disabled={sending} aria-label="Deck chat message" />
            <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label="Send message">
              <Send className="h-4 w-4" aria-hidden />
            </Button>
          </form>
        </div>
      )}

      <Dialog open={pendingDelete !== null} onOpenChange={(next) => !next && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete slide {pendingDelete?.slideOrder}?</DialogTitle>
            <DialogDescription>This cannot be undone from chat. Confirm to proceed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={sending}>
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
