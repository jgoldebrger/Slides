import { describe, expect, it } from "vitest";
import { mapDbSlide, parseSlideContent } from "@/lib/slides/map-db-slide";
import { PublicError, toPublicError } from "@/lib/errors/public-error";

describe("mapDbSlide", () => {
  it("validates layout and content instead of casting", () => {
    const slide = mapDbSlide({
      id: "11111111-1111-1111-1111-111111111111",
      order: 0,
      type: "content",
      layout: "not-a-layout",
      title: "Hello",
      content: { bullets: ["a"], unexpected: true },
      speaker_notes: "note",
      metadata: { k: 1 },
    });

    expect(slide.layout).toBe("bullets");
    expect(slide.content.bullets).toEqual(["a"]);
    expect(slide.speakerNotes).toBe("note");
  });

  it("returns empty content for invalid JSON shapes", () => {
    expect(parseSlideContent("nope")).toEqual({});
    expect(parseSlideContent(null)).toEqual({});
  });
});

describe("toPublicError", () => {
  it("passes through PublicError and safe messages", () => {
    expect(toPublicError(new PublicError("Slide not found"))).toBe(
      "Slide not found"
    );
    expect(toPublicError("Invalid outline")).toBe("Invalid outline");
  });

  it("hides infrastructure error text", () => {
    expect(
      toPublicError(new Error("duplicate key value violates unique constraint"))
    ).toBe("Something went wrong. Please try again.");
  });
});
