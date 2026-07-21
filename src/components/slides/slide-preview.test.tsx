import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SlidePreview } from "@/components/slides/slide-preview";

const sampleSlide = {
  id: "1",
  order: 0,
  type: "title" as const,
  layout: "title" as const,
  title: "Branded title",
  content: { body: "Subtitle" },
};

describe("SlidePreview", () => {
  afterEach(() => cleanup());

  it("When branding is off, should render title without accent bar", () => {
    const { container } = render(<SlidePreview slide={sampleSlide} />);
    expect(screen.getByText("Branded title")).toBeTruthy();
    const accentBars = container.querySelectorAll('[aria-hidden="true"]');
    expect(accentBars.length).toBe(0);
  });

  it("When branding is on, should apply primary color to title", () => {
    const { container } = render(
      <SlidePreview
        slide={sampleSlide}
        applyBranding
        brandTheme={{
          primaryColor: "#0F766E",
          accentColor: "#C55221",
          fontStyle: "sans",
        }}
      />
    );
    const accentBar = container.querySelector('[aria-hidden="true"]');
    expect(accentBar?.getAttribute("style")).toContain(
      "background-color: rgb(15, 118, 110)"
    );
    const title = screen.getByText("Branded title");
    expect(title.getAttribute("style")).toContain("color: rgb(15, 118, 110)");
  });
});
