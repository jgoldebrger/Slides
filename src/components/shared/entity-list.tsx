import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function formatListDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export const entityListPanelClass =
  "divide-y divide-link/15 overflow-hidden rounded-lg border border-link/20 bg-[var(--color-brand-100)]/75";

export const entityListRowClass =
  "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-link/10";

export const entityListMenuButtonClass = "h-8 w-8 text-link/70";

export function EntityListPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <ul className={cn(entityListPanelClass, className)}>{children}</ul>;
}

export function EntityListRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <li className={cn(entityListRowClass, className)}>{children}</li>;
}

export function EntityListPrimary({
  href,
  title,
  subtitle,
  className,
}: {
  href?: string;
  title: string;
  subtitle?: string | null;
  className?: string;
}) {
  const content = (
    <>
      <p className="truncate text-sm font-medium text-foreground">{title}</p>
      {subtitle ? (
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
    </>
  );

  const linkClass = cn(
    "min-w-0 flex-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    className
  );

  if (href) {
    return (
      <Link href={href} className={linkClass}>
        {content}
      </Link>
    );
  }

  return <div className={cn("min-w-0 flex-1", className)}>{content}</div>;
}

export function EntityListTrailing({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      {children}
    </div>
  );
}

export function EntityListMeta({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("hidden text-xs text-muted-foreground sm:inline", className)}
    >
      {children}
    </span>
  );
}

export function EntityListEmpty({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-link/25 bg-[var(--color-brand-100)]/50 px-4 py-12 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function EntityListSearchToolbar({
  value,
  onChange,
  placeholder,
  ariaLabel,
  countLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  countLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-md flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="h-10 border-link/20 bg-[var(--color-brand-50)] pl-9 focus-visible:ring-link/30"
        />
      </div>
      <p className="text-sm text-link/70">{countLabel}</p>
    </div>
  );
}
