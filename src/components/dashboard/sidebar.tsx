"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Presentation,
  Palette,
  Settings,
  LogOut,
  Users,
  Menu,
  X,
  History,
  Bot,
} from "lucide-react";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";
import { Logo } from "@/components/shared/logo";
import type { UserOrg } from "@/lib/org-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const editorNavBase = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/decks", label: "Decks", icon: Presentation },
  { href: "/brand-kit", label: "Brand kit", icon: Palette },
];

const settingsNavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
};

const viewerNav = [
  { href: "/decks", label: "Presentations", icon: Presentation },
];

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function userInitials(email: string) {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function DashboardSidebar({
  userEmail,
  isViewer = false,
  canManageTeam = false,
  showAiAgents = false,
  orgs = [],
  activeOrgId = "",
}: {
  userEmail: string;
  isViewer?: boolean;
  canManageTeam?: boolean;
  showAiAgents?: boolean;
  orgs?: UserOrg[];
  activeOrgId?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  const nav = isViewer
    ? viewerNav
    : [
        ...editorNavBase,
        { href: "/ai-history", label: "AI History", icon: History },
        ...(showAiAgents
          ? [{ href: "/agents", label: "AI Agents", icon: Bot }]
          : []),
        ...(canManageTeam
          ? [{ href: "/team", label: "Team", icon: Users }]
          : []),
        settingsNavItem,
      ];
  const homeHref = isViewer ? "/decks" : "/dashboard";

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const mobileNavClosed = isMobileViewport && !mobileOpen;

  useEffect(() => {
    if (!mobileOpen) return;

    const main = document.getElementById("main-content");
    if (main) main.inert = true;

    const menuButton = menuButtonRef.current;
    const aside = asideRef.current;

    const focusables = () =>
      aside
        ? (Array.from(aside.querySelectorAll(FOCUSABLE)) as HTMLElement[])
        : [];

    requestAnimationFrame(() => {
      focusables()[0]?.focus();
    });

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (e.key !== "Tab" || !aside) return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (main) main.inert = false;
      menuButton?.focus();
    };
  }, [mobileOpen]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navContent = (
    <>
      <div className="border-b border-link/15 px-4 py-6">
        <div className="relative flex items-center justify-center">
          <Logo
            href={homeHref}
            size="lg"
            onClick={() => setMobileOpen(false)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 min-h-10 min-w-10 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId || orgs[0]?.id || ""} />
        {isViewer && (
          <p className="mt-1 text-center text-xs text-link/70">Viewer</p>
        )}
      </div>
      <nav
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4"
        aria-label="Main"
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-link text-primary-foreground shadow-none"
                  : "text-link/75 hover:bg-link/10 hover:text-link"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-link/15 bg-link/5 p-3">
        <div className="flex items-center gap-2 rounded-lg border border-link/15 bg-[var(--color-brand-100)]/80 p-2">
          <Link
            href="/settings/account"
            onClick={() => setMobileOpen(false)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 transition-colors hover:bg-link/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-link/15 text-xs font-semibold text-link"
              aria-hidden
            >
              {userInitials(userEmail)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-link">
                {userEmail.split("@")[0]}
              </span>
              <span className="block truncate text-xs text-link/65">
                {userEmail}
              </span>
            </span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 text-link/70 hover:bg-link/10 hover:text-link"
            onClick={signOut}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-link/15 bg-raised px-4 py-3 md:hidden">
        <Button
          ref={menuButtonRef}
          type="button"
          variant="outline"
          size="icon"
          className="min-h-10 min-w-10"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
          aria-controls="dashboard-sidebar"
          data-testid="mobile-nav-open"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Logo href={homeHref} size="md" />
      </div>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/50 md:hidden"
          aria-label="Close navigation overlay"
          tabIndex={-1}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        ref={asideRef}
        id="dashboard-sidebar"
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen || undefined}
        aria-label={mobileOpen ? "Navigation" : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-60 shrink-0 flex-col border-r border-link/15 bg-raised transition-transform md:sticky md:top-0 md:z-auto md:max-h-screen md:self-start md:overflow-hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          mobileNavClosed && "invisible pointer-events-none"
        )}
        inert={mobileNavClosed ? true : undefined}
        aria-hidden={mobileNavClosed ? true : undefined}
      >
        {navContent}
      </aside>
    </>
  );
}
