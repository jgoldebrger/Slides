import { generatePptxBuffer } from "@/lib/export/pptx";
import type { BrandTheme } from "@/lib/brand";
import type { Slide } from "@/types/slide";
import type { PptxExportOptions } from "@/lib/export/pptx";

export type ExportFormat = "pptx";

export type ExportArtifact = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

type FormatHandler = (
  slides: Slide[],
  deckName: string,
  theme: BrandTheme,
  options: PptxExportOptions
) => Promise<ExportArtifact>;

const handlers: Record<ExportFormat, FormatHandler> = {
  pptx: async (slides, deckName, theme, options) => ({
    buffer: await generatePptxBuffer(slides, deckName, theme, options),
    contentType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: "pptx",
  }),
};

export function isExportFormat(value: string): value is ExportFormat {
  return value in handlers;
}

export async function generateExportArtifact(
  format: string,
  slides: Slide[],
  deckName: string,
  theme: BrandTheme,
  options: PptxExportOptions = {}
): Promise<ExportArtifact> {
  if (!isExportFormat(format)) {
    throw new Error(`Unsupported export format: ${format}`);
  }
  return handlers[format](slides, deckName, theme, options);
}
