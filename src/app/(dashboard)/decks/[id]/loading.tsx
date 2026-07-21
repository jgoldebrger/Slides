export default function DeckLoading() {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <div className="h-6 w-32 animate-pulse rounded-md bg-muted" />
      <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
