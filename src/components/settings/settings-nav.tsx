"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const BASE_LINKS = [
  { href: "/settings/account", label: "Account" },
  { href: "/settings/billing", label: "Billing" },
] as const;

const ADMIN_LINKS = [
  { href: "/settings/ai-preferences", label: "AI preferences" },
  { href: "/settings/ai-features", label: "Features" },
  { href: "/settings/ai-addons", label: "Add-ons" },
  { href: "/settings/connectors", label: "Connectors" },
  { href: "/settings/org-memory", label: "Org memory" },
  { href: "/settings/ai-usage", label: "Usage" },
] as const;

export function SettingsNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...BASE_LINKS, ...ADMIN_LINKS] : BASE_LINKS;

  return (
    <nav
      aria-label="Settings sections"
      className="overflow-x-auto rounded-lg border border-link/20 bg-[var(--color-brand-100)]/80 px-1 py-1"
    >
      <ul className="flex min-w-max gap-1">
        {links.map(({ href, label }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-link text-primary-foreground"
                    : "text-link/75 hover:bg-link/10 hover:text-link"
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
