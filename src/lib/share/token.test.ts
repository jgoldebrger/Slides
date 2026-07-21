import { describe, expect, it } from "vitest";
import { generateShareToken, hashShareToken } from "@/lib/share/token";

describe("share token", () => {
  it("generates unique tokens and stable hashes", () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
    expect(hashShareToken(a)).toEqual(hashShareToken(a));
    expect(hashShareToken(a)).not.toEqual(hashShareToken(b));
  });
});
