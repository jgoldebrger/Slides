import { describe, it, expect } from "vitest";
import { projectSchema, deckOutlineSchema, rewriteInstructionsSchema } from "@/lib/validations";

describe("projectSchema", () => {
  it("accepts valid project", () => {
    const result = projectSchema.safeParse({
      name: "Q3 Launch",
      description: "Product launch",
      status: "active",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = projectSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});

describe("deckOutlineSchema", () => {
  it("accepts valid outline", () => {
    const result = deckOutlineSchema.safeParse({
      deckType: "project_status",
      slides: [
        {
          title: "Title",
          layout: "title",
          type: "title",
          summary: "Opening slide",
        },
        {
          title: "Progress",
          layout: "bullets",
          type: "content",
          summary: "Key progress items",
        },
        {
          title: "Next steps",
          layout: "bullets",
          type: "content",
          summary: "Upcoming work",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal 2-slide outline for sparse projects", () => {
    const result = deckOutlineSchema.safeParse({
      deckType: "project_status",
      slides: [
        {
          title: "Project Update",
          layout: "title",
          type: "title",
          summary: "Cover slide",
        },
        {
          title: "Add project updates",
          layout: "bullets",
          type: "content",
          summary: "Placeholder until updates are added",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("rewriteInstructionsSchema", () => {
  it("trims and accepts valid instructions", () => {
    const result = rewriteInstructionsSchema.safeParse("  shorter  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("shorter");
    }
  });

  it("returns undefined for blank instructions", () => {
    const result = rewriteInstructionsSchema.safeParse("   ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeUndefined();
    }
  });

  it("rejects instructions over 500 characters", () => {
    const result = rewriteInstructionsSchema.safeParse("a".repeat(501));
    expect(result.success).toBe(false);
  });
});
