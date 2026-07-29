import { describe, expect, it } from "vitest";
import {
  normalizeSlideAnimationSettings,
  parseSlideAnimation,
  slideAnimationClass,
} from "@/lib/slides/animations";

describe("slide animations", () => {
  it("returns defaults when metadata is missing", () => {
    expect(parseSlideAnimation(null)).toEqual({
      entrance: "fade",
      animateContent: true,
      staggerBullets: false,
    });
  });

  it("parses stored animation settings", () => {
    expect(
      parseSlideAnimation({
        animation: { entrance: "zoom", staggerBullets: true },
      })
    ).toEqual({
      entrance: "zoom",
      animateContent: true,
      staggerBullets: true,
    });
  });

  it("maps entrance to css class", () => {
    expect(slideAnimationClass("slide-up")).toBe("slide-anim-up");
    expect(slideAnimationClass("none")).toBeUndefined();
  });

  it("fills defaults for partial animation settings", () => {
    expect(
      normalizeSlideAnimationSettings({ entrance: "fade", staggerBullets: false })
    ).toEqual({
      entrance: "fade",
      animateContent: true,
      staggerBullets: false,
    });
  });
});
