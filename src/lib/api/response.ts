import { NextResponse } from "next/server";
import { PermissionError } from "@/lib/permissions";
import { RateLimitError } from "@/lib/rate-limit";
import { NoProjectContentError } from "@/lib/ai/no-project-content-error";

type ApiErrorOptions = {
  retryAfterSeconds?: number;
};

export function apiError(
  message: string,
  status = 400,
  code = "bad_request",
  options?: ApiErrorOptions
) {
  const headers =
    status === 429 && options?.retryAfterSeconds != null
      ? { "Retry-After": String(Math.max(1, Math.ceil(options.retryAfterSeconds))) }
      : undefined;

  return NextResponse.json(
    { error: { code, message } },
    { status, headers }
  );
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

/** Map a thrown error to an HTTP response. */
export function handleApiError(err: unknown) {
  if (err instanceof RateLimitError) {
    return apiError(err.message, 429, "rate_limit_exceeded", {
      retryAfterSeconds: err.retryAfterMs / 1000,
    });
  }
  if (err instanceof PermissionError) {
    const unauthorized = err.message === "Authentication required";
    return apiError(
      err.message,
      unauthorized ? 401 : 403,
      unauthorized ? "unauthorized" : "forbidden"
    );
  }
  if (err instanceof NoProjectContentError) {
    return apiError(err.message, 400, "no_project_content");
  }
  console.error("[api]", err);
  return apiError("Internal server error", 500, "internal_error");
}

/**
 * Map server-action `{ error }` / success payloads to HTTP without losing
 * status codes (rate limit, auth, business rules).
 */
export function respondFromActionResult(result: {
  error?: unknown;
  [key: string]: unknown;
}) {
  if (result.error == null) {
    const data = { ...result };
    delete data.error;
    return apiSuccess(data);
  }

  const message =
    typeof result.error === "string"
      ? result.error
      : "Request failed";

  return classifyActionErrorMessage(message);
}

export function classifyActionErrorMessage(message: string) {
  if (/rate limit/i.test(message)) {
    return apiError(message, 429, "rate_limit_exceeded", {
      retryAfterSeconds: 3600,
    });
  }
  if (/authentication required/i.test(message)) {
    return apiError(message, 401, "unauthorized");
  }
  if (
    /view-only|access denied|not a member|permission/i.test(message)
  ) {
    return apiError(message, 403, "forbidden");
  }
  if (/not found/i.test(message)) {
    return apiError(message, 404, "not_found");
  }
  if (/already in progress|already exists/i.test(message)) {
    return apiError(message, 409, "conflict");
  }
  return apiError(message, 400, "bad_request");
}

export { safeRedirectPath } from "@/lib/safe-redirect";
