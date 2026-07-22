"use client";

import { ErrorState } from "@/components/shared/state";

export default function DeckError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Could not load deck"
      message={error.message}
      retry={reset}
    />
  );
}
