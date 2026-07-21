import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const DECK_STATUSES = [
  "draft",
  "outline",
  "approved",
  "generating",
  "ready",
  "failed",
] as const;

export type DeckStatus = (typeof DECK_STATUSES)[number] | string;

const STATUS_META: Record<
  string,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  draft: {
    label: "Draft",
    icon: Pencil,
    className: "bg-muted text-muted-foreground",
  },
  outline: {
    label: "Outline",
    icon: FileText,
    className: "bg-info/15 text-info",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-success/15 text-success",
  },
  generating: {
    label: "Generating",
    icon: Loader2,
    className: "bg-link/15 text-link",
  },
  ready: {
    label: "Ready",
    icon: Sparkles,
    className: "bg-primary text-primary-foreground",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    className: "bg-destructive/15 text-destructive",
  },
};

export function DeckStatusBadge({
  status,
  className,
}: {
  status: DeckStatus;
  className?: string;
}) {
  const meta = STATUS_META[status] ?? {
    label: String(status).replace(/_/g, " "),
    icon: FileText,
    className: "bg-muted text-muted-foreground",
  };
  const Icon = meta.icon;

  return (
    <span
      data-testid="deck-status-badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        meta.className,
        className
      )}
    >
      <Icon
        className={cn("h-3.5 w-3.5", status === "generating" && "animate-spin")}
        aria-hidden
      />
      {meta.label}
    </span>
  );
}
