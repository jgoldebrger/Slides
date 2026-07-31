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

  it("When 6 bullets, title font size should be smaller than 2-bullet airy slide", () => {
    const airy = {
      id: "a",
      order: 0,
      type: "content" as const,
      layout: "bullets" as const,
      title: "Few",
      content: { bullets: ["One", "Two"] },
    };
    const compact = {
      id: "b",
      order: 1,
      type: "content" as const,
      layout: "bullets" as const,
      title: "Many",
      content: {
        bullets: ["1", "2", "3", "4", "5", "6"],
      },
    };

    const { container: airyContainer } = render(<SlidePreview slide={airy} />);
    const { container: compactContainer } = render(<SlidePreview slide={compact} />);

    const airyTitle = airyContainer.querySelector("h2");
    const compactTitle = compactContainer.querySelector("h2");
    const airySize = Number(airyTitle?.style.fontSize.replace("px", ""));
    const compactSize = Number(compactTitle?.style.fontSize.replace("px", ""));
    expect(compactSize).toBeLessThan(airySize);
  });

  it("When branding is on bullets slide, should show accent bar", () => {
    const slide = {
      id: "b",
      order: 0,
      type: "content" as const,
      layout: "bullets" as const,
      title: "Branded",
      content: { bullets: ["One"] },
    };
    const { container } = render(
      <SlidePreview
        slide={slide}
        applyBranding
        brandTheme={{
          primaryColor: "#0F766E",
          accentColor: "#C55221",
          fontStyle: "sans",
        }}
      />
    );
    const accentBars = container.querySelectorAll('[aria-hidden="true"]');
    expect(accentBars.length).toBeGreaterThan(0);
  });

  it("When branding is on title slide, should apply primary color to title", () => {
    render(
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
    const title = screen.getByRole("heading", { level: 2 });
    expect(title.getAttribute("style")).toContain("color: rgb(15, 118, 110)");
  });
});
