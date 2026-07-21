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
} from "lucide-react";
import { OrgSwitcher } from "@/components/dashboard/org-switcher";
import type { UserOrg } from "@/lib/org-context";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const editorNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/decks", label: "Decks", icon: Presentation },
  { href: "/brand-kit", label: "Brand kit", icon: Palette },
  { href: "/settings", label: "Settings", icon: Settings },
];

const viewerNav = [
  { href: "/decks", label: "Presentations", icon: Presentation },
];

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function DashboardSidebar({
  orgName,
  userEmail,
  isViewer = false,
  canManageTeam = false,
  orgs = [],
  activeOrgId = "",
}: {
  orgName: string;
  userEmail: string;
  isViewer?: boolean;
  canManageTeam?: boolean;
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
        ...editorNav,
        ...(canManageTeam
          ? [{ href: "/settings/team", label: "Team", icon: Users }]
          : []),
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
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <Link
            href={homeHref}
            className="rounded-sm text-base font-semibold tracking-tight text-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setMobileOpen(false)}
          >
            UpdateDeck
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="min-h-10 min-w-10 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{orgName}</p>
        <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId || orgs[0]?.id || ""} />
        {isViewer && (
          <p className="mt-1 text-xs text-muted-foreground">Viewer</p>
        )}
      </div>
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label="Main">
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
                "relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-muted text-link before:absolute before:left-0 before:top-1 before:bottom-1 before:w-0.5 before:rounded-full before:bg-link"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start gap-2"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
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
        <Link
          href={homeHref}
          className="rounded-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          UpdateDeck
        </Link>
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
          "fixed inset-y-0 left-0 z-50 flex h-screen w-56 shrink-0 flex-col border-r border-border bg-card transition-transform md:sticky md:top-0 md:z-auto md:max-h-screen md:self-start md:overflow-hidden",
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
