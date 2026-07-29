import { Logo } from "@/components/shared/logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme="dark"
      className="relative min-h-screen bg-background text-foreground"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-link/10"
        style={{
          maskImage:
            "radial-gradient(ellipse at 30% 70%, black, transparent 65%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 30% 70%, black, transparent 65%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-link/10"
        style={{
          maskImage:
            "radial-gradient(ellipse at 80% 20%, black, transparent 55%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 80% 20%, black, transparent 55%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 min-h-screen lg:grid lg:grid-cols-2">
        <aside className="relative hidden flex-col justify-between p-10 xl:p-14 lg:flex">
          <Logo href="/" size="lg" />
          <div className="max-w-md">
            <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
              Project status decks
            </p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
              Turn updates into polished presentations
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Structured project data in. Branded PPTX out — without rebuilding
              slides every week.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} UpdateDeck
          </p>
        </aside>

        <main className="flex min-h-screen flex-col justify-center px-4 py-12 sm:px-8 lg:px-12 xl:px-16">
          <div className="mb-8 lg:hidden">
            <Logo href="/" size="lg" />
          </div>
          <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-8 sm:p-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
