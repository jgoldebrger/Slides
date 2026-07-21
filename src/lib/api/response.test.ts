import { describe, it, expect } from "vitest";
import {
  classifyActionErrorMessage,
  safeRedirectPath,
} from "@/lib/api/response";
import { PermissionError } from "@/lib/permissions";
import { RateLimitError } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/api/response";

describe("safeRedirectPath", () => {
  it("allows relative app paths", () => {
    expect(safeRedirectPath("/decks")).toBe("/decks");
    expect(safeRedirectPath("/decks/abc/editor")).toBe("/decks/abc/editor");
  });

  it("rejects open redirects", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("http://evil.com/phish")).toBe("/dashboard");
  });

  it("uses fallback when missing", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath(undefined, "/decks")).toBe("/decks");
  });
});

describe("classifyActionErrorMessage", () => {
  it("maps rate limit to 429", async () => {
    const res = classifyActionErrorMessage(
      "Rate limit exceeded for outline. Try again later."
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    const body = await res.json();
    expect(body.error.code).toBe("rate_limit_exceeded");
  });

  it("maps auth and forbidden", async () => {
    expect(
      (await classifyActionErrorMessage("Authentication required").json())
        .error.code
    ).toBe("unauthorized");
    expect(classifyActionErrorMessage("Authentication required").status).toBe(
      401
    );
    expect(classifyActionErrorMessage("View-only access").status).toBe(403);
  });

  it("maps not found and conflict", () => {
    expect(classifyActionErrorMessage("Deck not found").status).toBe(404);
    expect(
      classifyActionErrorMessage("Slide generation is already in progress")
        .status
    ).toBe(409);
  });
});

describe("handleApiError", () => {
  it("preserves RateLimitError and PermissionError", async () => {
    const rate = handleApiError(
      new RateLimitError("too many", 90_000)
    );
    expect(rate.status).toBe(429);
    expect(rate.headers.get("Retry-After")).toBe("90");

    const auth = handleApiError(
      new PermissionError("Authentication required")
    );
    expect(auth.status).toBe(401);
    const body = await auth.json();
    expect(body.error.code).toBe("unauthorized");
  });
});
