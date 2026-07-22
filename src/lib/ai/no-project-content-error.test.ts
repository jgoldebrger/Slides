import { describe, expect, it } from "vitest";
import {
  assertProjectContentForGeneration,
  NoProjectContentError,
  NO_PROJECT_CONTENT_MESSAGE,
} from "@/lib/ai/no-project-content-error";

describe("no-project-content-error", () => {
  it("throws when updates have no items", () => {
    expect(() => assertProjectContentForGeneration({})).toThrow(
      NoProjectContentError
    );
    expect(() => assertProjectContentForGeneration({})).toThrow(
      NO_PROJECT_CONTENT_MESSAGE
    );
  });

  it("returns analysis when content exists", () => {
    const analysis = assertProjectContentForGeneration({
      progress: "Shipped v2.",
    });
    expect(analysis.totalItems).toBeGreaterThan(0);
  });
});
