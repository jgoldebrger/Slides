import { describe, expect, it } from "vitest";
import { defaultDeckName, parseQuickUpdate } from "@/lib/decks/create-wizard";

describe("parseQuickUpdate", () => {
  it("parses narrative and labeled sections", () => {
    const result = parseQuickUpdate(
      "Shipped beta.\nDone: API migration\nNext: Roll out Friday"
    );
    expect(result.progress).toContain("Shipped beta");
    expect(result.completed_work).toEqual(["API migration"]);
    expect(result.next_steps).toEqual(["Roll out Friday"]);
  });
});

describe("defaultDeckName", () => {
  it("includes project name and month", () => {
    expect(defaultDeckName("Platform")).toMatch(/^Platform — /);
  });
});
