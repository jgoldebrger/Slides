"use client";

import { ErrorState } from "@/components/shared/state";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Something went wrong"
      message={error.message}
      retry={reset}
    />
  );
}
