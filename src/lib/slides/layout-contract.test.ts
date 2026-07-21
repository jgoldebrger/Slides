import { describe, it, expect } from "vitest";
import {
  LAYOUT_CONTRACT,
  assertLayoutContractsComplete,
} from "@/lib/slides/layout-contract";
import { SLIDE_LAYOUTS } from "@/types/slide";
import { PPTX_LAYOUT_MAPPERS } from "@/lib/export/layouts/registry";

describe("LAYOUT_CONTRACT", () => {
  it("covers every SlideLayout", () => {
    expect(() => assertLayoutContractsComplete()).not.toThrow();
    for (const layout of SLIDE_LAYOUTS) {
      expect(LAYOUT_CONTRACT[layout].slots.length).toBeGreaterThan(0);
      expect(LAYOUT_CONTRACT[layout].fillHint.length).toBeGreaterThan(0);
    }
  });

  it("aligns with PPTX layout mappers", () => {
    for (const layout of SLIDE_LAYOUTS) {
      expect(PPTX_LAYOUT_MAPPERS[layout]).toBeTypeOf("function");
    }
  });
});
