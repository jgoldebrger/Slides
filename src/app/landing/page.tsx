import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Home" };

function DeckHeroVisual() {
  return (
    <div
      className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
      aria-hidden
    >
      <div className="absolute -right-[10%] top-[15%] w-[70%] max-w-4xl rotate-[-4deg] opacity-90">
        <div className="rounded-lg border border-border-strong bg-card p-5 shadow-none">
          <div className="mb-4 h-1.5 w-20 rounded-full bg-primary" />
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Q3 project status
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-foreground">
            Platform rollout on track
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Migration 78% complete
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              NPS up 12 points
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Launch window confirmed
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:text-foreground focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      <main id="main-content">
        <div data-theme="dark" className="relative">
          <header className="relative z-20 border-b border-border bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
              <span className="text-xl font-semibold tracking-tight text-link">
                UpdateDeck
              </span>
              <nav className="flex items-center gap-3" aria-label="Account">
                <Button variant="ghost" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/signup">Get started</Link>
                </Button>
              </nav>
            </div>
          </header>

          <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-background">
            <DeckHeroVisual />
            <div
              className="absolute inset-0 hidden bg-link/10 md:block"
              style={{
                maskImage:
                  "radial-gradient(ellipse at top right, black, transparent 55%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse at top right, black, transparent 55%)",
              }}
              aria-hidden
            />

            <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center px-6 py-20">
              <h1 className="text-5xl font-semibold leading-[0.95] tracking-tight text-foreground sm:text-7xl">
                UpdateDeck
              </h1>
              <p className="mt-8 max-w-lg text-2xl font-medium text-foreground/90 sm:text-3xl">
                Turn status updates into polished decks.
              </p>
              <p className="mt-4 max-w-md text-base text-muted-foreground">
                Structured project data in. Branded presentations out, without
                rebuilding slides every week.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Button size="lg" asChild>
                  <Link href="/signup">
                    Start free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>

        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              One workflow, end to end
            </h2>
            <p className="mt-3 max-w-lg text-muted-foreground">
              Capture updates, generate an outline, then export a branded PPTX.
            </p>
            <ol className="mt-10 max-w-2xl space-y-6">
              <li>
                <h3 className="text-lg font-semibold">Capture updates</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Goals, milestones, metrics, and risks in one structured form.
                </p>
              </li>
              <li>
                <h3 className="text-lg font-semibold">Generate outlines</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  AI drafts slide structure from your data. Review and approve
                  before generating.
                </p>
              </li>
              <li>
                <h3 className="text-lg font-semibold">Export branded PPTX</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Apply your brand kit and download presentation-ready files.
                </p>
              </li>
            </ol>
          </div>
        </section>

        <section className="border-t border-border bg-raised">
          <div className="mx-auto max-w-6xl px-6 py-16 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              Ready to ship your next update?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              PPTX with your brand kit, from the updates you already capture.
            </p>
            <Button size="lg" className="mt-8" asChild>
              <Link href="/signup">Create your workspace</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} UpdateDeck</span>
          <Link href="/login" className="text-link underline underline-offset-4">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
