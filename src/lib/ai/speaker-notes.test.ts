import { describe, expect, it } from "vitest";
import { speakerNotesRepeatBullets } from "@/lib/ai/speaker-notes";

describe("speakerNotesRepeatBullets", () => {
  it("detects when notes mostly repeat bullets", () => {
    const bullets = ["Revenue up 12%", "NPS at 72"];
    const notes = "Revenue is up 12 percent and NPS is at 72.";
    expect(speakerNotesRepeatBullets(bullets, notes)).toBe(true);
  });

  it("allows additive presenter notes", () => {
    const bullets = ["Revenue up 12%"];
    const notes =
      "Pause here — leadership cares most about the trend line. Transition: next we cover delivery risks.";
    expect(speakerNotesRepeatBullets(bullets, notes)).toBe(false);
  });
});
