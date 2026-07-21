import { describe, it, expect } from "vitest";
import { safeRedirectPath } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it("allows relative app paths", () => {
    expect(safeRedirectPath("/decks")).toBe("/decks");
    expect(safeRedirectPath("/invite/abc")).toBe("/invite/abc");
  });

  it("rejects open redirects", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
  });

  it("uses fallback when missing", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath(undefined, "/decks")).toBe("/decks");
  });
});
