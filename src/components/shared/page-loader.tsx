import { LogoMark } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

type PageLoaderProps = {
  message?: string;
  className?: string;
  /** Center in a tall viewport area (route transitions). */
  fullPage?: boolean;
  size?: "md" | "lg";
};

export function PageLoader({
  message,
  className,
  fullPage = false,
  size = "lg",
}: PageLoaderProps) {
  const markSize = size === "lg" ? "h-10 w-10" : "h-8 w-8";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message ?? "Loading"}
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullPage ? "min-h-[50vh]" : "py-16",
        className
      )}
    >
      <LogoMark className={cn(markSize, "animate-spin")} />
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}
