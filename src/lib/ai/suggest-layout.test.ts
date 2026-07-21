import { describe, expect, it } from "vitest";
import { suggestLayoutForContent } from "@/lib/ai/suggest-layout";

describe("suggestLayoutForContent", () => {
  it("suggests title for cover slides", () => {
    expect(suggestLayoutForContent("Project kickoff cover")).toBe("title");
  });

  it("suggests metrics_grid for KPI content", () => {
    expect(suggestLayoutForContent("Q4 revenue", "NPS score up 12%")).toBe(
      "metrics_grid"
    );
  });

  it("defaults to bullets", () => {
    expect(suggestLayoutForContent("Status update")).toBe("bullets");
  });
});
