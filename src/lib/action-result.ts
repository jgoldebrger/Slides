import { isActionError, type ActionFailure } from "@/lib/errors/public-error";

export function getActionError(
  result: { error?: unknown; success?: boolean } | Record<string, unknown>
): string | null {
  if (isActionError(result as ActionFailure | object)) {
    return result.error as string;
  }
  if (result.error == null) return null;
  if (typeof result.error === "string") {
    // Legacy `{ error: string }` without success:false — treat as failure
    if (result.success === true) return null;
    return result.error;
  }
  if (typeof result.error === "object" && result.error !== null) {
    const err = result.error as Record<string, unknown>;
    if (Array.isArray(err._form) && err._form[0]) {
      return String(err._form[0]);
    }
    const firstField = Object.values(err).find(
      (v) => Array.isArray(v) && v[0]
    ) as string[] | undefined;
    if (firstField?.[0]) return String(firstField[0]);
  }
  return "Something went wrong";
}
