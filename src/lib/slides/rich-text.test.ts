import { describe, expect, it } from "vitest";
import {
  hasRichTextMarkup,
  richTextToPlainText,
  sanitizeRichText,
} from "@/lib/slides/rich-text";

describe("rich-text", () => {
  it("detects markup", () => {
    expect(hasRichTextMarkup("plain")).toBe(false);
    expect(hasRichTextMarkup("<b>bold</b>")).toBe(true);
  });

  it("strips tags to plain text", () => {
    expect(richTextToPlainText("Hello <strong>world</strong>")).toBe(
      "Hello world"
    );
    expect(richTextToPlainText("Line<br>two")).toBe("Line\ntwo");
  });

  it("removes script tags on sanitize", () => {
    expect(sanitizeRichText('<b>ok</b><script>alert(1)</script>')).toBe(
      "<b>ok</b>"
    );
  });

  it("keeps allowed inline styles", () => {
    const input =
      '<span style="color:#dc2626;font-size:20px">Red large</span>';
    expect(sanitizeRichText(input)).toContain("color:#dc2626");
    expect(sanitizeRichText(input)).toContain("font-size:20px");
  });
});
