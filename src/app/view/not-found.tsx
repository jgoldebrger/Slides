import Link from "next/link";

export default function SharedViewNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-none">
        <h1 className="text-xl font-semibold">This share link is unavailable</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The link may have expired, been revoked, or is invalid. Ask the deck
          owner for a new share link.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Sign in to UpdateDeck
        </Link>
      </div>
    </main>
  );
}
