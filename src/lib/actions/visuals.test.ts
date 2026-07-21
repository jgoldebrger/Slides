import { describe, expect, it } from "vitest";
import { isAllowedImageMime } from "@/lib/ai/visuals";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function validateImageFile(file: { size: number; type: string } | null) {
  if (!file || file.size === 0) return { error: "Upload an image" } as const;
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "Image must be under 5MB" } as const;
  }
  if (!isAllowedImageMime(file.type)) {
    return { error: "Only PNG, JPEG, and WebP images are allowed" } as const;
  }
  return { file } as const;
}

describe("slide visual upload validation", () => {
  it("rejects empty file", () => {
    expect(validateImageFile(null).error).toBe("Upload an image");
    expect(validateImageFile({ size: 0, type: "image/png" }).error).toBe(
      "Upload an image"
    );
  });

  it("rejects oversize file", () => {
    expect(
      validateImageFile({ size: MAX_UPLOAD_BYTES + 1, type: "image/png" }).error
    ).toBe("Image must be under 5MB");
  });

  it("rejects unsupported mime", () => {
    expect(validateImageFile({ size: 100, type: "image/gif" }).error).toBe(
      "Only PNG, JPEG, and WebP images are allowed"
    );
  });

  it("accepts valid png", () => {
    const result = validateImageFile({ size: 100, type: "image/png" });
    expect("file" in result).toBe(true);
  });
});
