import Link from "next/link";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { mark: "h-7 w-7", text: "text-sm", gap: "gap-2.5" },
  md: { mark: "h-8 w-8", text: "text-base", gap: "gap-3" },
  lg: { mark: "h-9 w-9", text: "text-lg", gap: "gap-3" },
} as const;

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn("grid shrink-0 grid-cols-2 gap-[3px]", className)}
      aria-hidden
    >
      <span className="rounded-full bg-link" />
      <span className="rounded-full bg-[var(--color-brand-500)]" />
      <span className="rounded-full bg-[var(--color-brand-400)]" />
      <span className="rounded-full bg-[var(--color-brand-300)]" />
    </span>
  );
}

type LogoProps = {
  href?: string;
  size?: keyof typeof sizes;
  className?: string;
  onClick?: () => void;
};

export function Logo({ href, size = "md", className, onClick }: LogoProps) {
  const { mark, text, gap } = sizes[size];

  const content = (
    <span className={cn("inline-flex items-center", gap, className)}>
      <LogoMark className={mark} />
      <span
        className={cn(
          "inline-flex items-baseline leading-none select-none",
          text
        )}
      >
        <span className="font-medium tracking-[-0.06em] text-foreground/75">
          update
        </span>
        <span className="font-bold tracking-[-0.05em] text-link">deck</span>
      </span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {content}
      </Link>
    );
  }

  return content;
}
