/** Safe relative path for post-auth redirects — blocks open redirects. */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("://") || next.includes("\\")) return fallback;
  return next;
}
