/**
 * Map infrastructure / unexpected errors to stable client-facing messages.
 * Log the original detail server-side; never return raw DB/provider text.
 */

export type ActionFailure = { error: string; success?: false };

export function toPublicError(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (err instanceof PublicError) return err.message;

  if (typeof err === "string") {
    if (isSafeUserMessage(err)) return err;
    return fallback;
  }

  if (err instanceof Error) {
    if (isSafeUserMessage(err.message)) return err.message;
    if (process.env.NODE_ENV !== "production") {
      console.error("[public-error]", err.message);
    }
    return fallback;
  }

  return fallback;
}

export function formError(message: string) {
  return { error: { _form: [message] } as Record<string, string[]> };
}

export function actionError(message: string): ActionFailure {
  return { error: message, success: false };
}

export function isActionError(
  result: object
): result is ActionFailure {
  if (!("error" in result)) return false;
  const err = (result as { error?: unknown; success?: unknown }).error;
  const success = (result as { success?: unknown }).success;
  return typeof err === "string" && success !== true;
}

/** Explicit user-facing error that is safe to return to the client. */
export class PublicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicError";
  }
}

const INFRA_HINT =
  /postgres|supabase|pgrst|jwt|permission denied|violates|foreign key|duplicate key|relation |column |timeout|ECONN|ENOTFOUND|openai|stripe|resend|inngest|stack|exception/i;

function isSafeUserMessage(message: string): boolean {
  if (!message || message.length > 180) return false;
  if (INFRA_HINT.test(message)) return false;
  return true;
}
