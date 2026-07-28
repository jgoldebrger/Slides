import { cn } from "@/lib/utils";
import { PageLoader } from "@/components/shared/page-loader";

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
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-link/25 bg-[var(--color-brand-100)]/50 px-4 py-12 text-center",
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

export function LoadingState({
  message = "Loading…",
  fullPage = false,
}: {
  message?: string;
  fullPage?: boolean;
}) {
  return <PageLoader message={message} fullPage={fullPage} />;
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
