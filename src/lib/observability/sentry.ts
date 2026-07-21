import * as Sentry from "@sentry/nextjs";

export function captureJobError(
  error: unknown,
  context: Record<string, unknown> & { orgId?: string }
) {
  if (!process.env.SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    if (context.orgId) scope.setTag("org_id", String(context.orgId));
    scope.setExtras(context);
    Sentry.captureException(error);
  });
}
