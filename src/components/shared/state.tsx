import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 px-4 py-12 text-center",
        className
      )}
    >
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-16" role="status">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground"
          aria-hidden
        />
        {message}
      </div>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  retry,
}: {
  title?: string;
  message?: string;
  retry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-6 text-center"
    >
      <h3 className="font-medium text-destructive">{title}</h3>
      {message && <p className="mt-2 text-sm text-destructive/90">{message}</p>}
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="mt-4 text-sm font-medium text-destructive underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
      )}
    </div>
  );
}
