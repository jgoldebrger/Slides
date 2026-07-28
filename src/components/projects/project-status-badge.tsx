import { cn } from "@/lib/utils";

export function ProjectStatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  const tone =
    status === "active"
      ? "bg-success/15 text-success"
      : status === "on_hold"
        ? "bg-warning/15 text-warning"
        : status === "completed"
          ? "bg-muted text-muted-foreground"
          : "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        tone
      )}
    >
      {label}
    </span>
  );
}
