import { z } from "zod";
import { projectUpdateSchema } from "@/lib/validations";
import { addonLlm, scrubPii, scanSecrets } from "@/lib/ai/addons/helpers";

const partialUpdate = projectUpdateSchema.partial();

export async function g01ScreenshotMetrics(projectName: string, ocrText: string) {
  const schema = z.object({
    metrics: z.array(
      z.object({ name: z.string(), value: z.string(), trend: z.string().optional() })
    ),
  });
  return addonLlm(
    schema,
    `Extract KPI metrics from dashboard screenshot OCR for ${projectName}.\n${ocrText}`
  );
}

export async function g02FigmaPaste(projectName: string, text: string) {
  return addonLlm(
    partialUpdate,
    `Parse Figma/FigJam export into project updates for ${projectName}.\n${text}`
  );
}

export async function g03WikiImport(projectName: string, text: string) {
  const { scrubbed } = scrubPii(text);
  return addonLlm(
    partialUpdate,
    `Parse Confluence/Notion page content into updates for ${projectName}.\n${scrubbed}`
  );
}

export async function g04CsvMetrics(csv: string) {
  const schema = z.object({
    metrics: z.array(
      z.object({ name: z.string(), value: z.string(), trend: z.string().optional() })
    ),
  });
  return addonLlm(schema, `Map CSV columns to metrics.\n${csv}`);
}

export async function g05CalendarParse(text: string) {
  const schema = z.object({
    milestones: z.array(z.object({ title: z.string(), date: z.string() })),
  });
  return addonLlm(schema, `Extract milestone dates from calendar/ics text.\n${text}`);
}

export async function g06PrdRfc(text: string) {
  const schema = z.object({
    goals: z.array(z.string()),
    risks: z.array(z.string()),
    openQuestions: z.array(z.string()),
  });
  return addonLlm(schema, `Ingest PRD/RFC into goals, risks, open questions.\n${text}`, "strong");
}

export async function g07QuoteBank(text: string) {
  const schema = z.object({
    quotes: z.array(
      z.object({ text: z.string(), source: z.string(), tag: z.string() })
    ),
  });
  return addonLlm(schema, `Tag customer quotes for claim-proof slides.\n${text}`);
}

export async function g08IncidentDigest(text: string) {
  return addonLlm(
    partialUpdate,
    `Digest incident/PagerDuty paste into blockers and risks.\n${text}`
  );
}

export async function g09OkrImport(text: string) {
  return addonLlm(partialUpdate, `Import OKR check-in paste.\n${text}`);
}

export async function g10MultiProjectSplit(text: string) {
  const schema = z.object({
    projects: z.array(
      z.object({ name: z.string(), updates: partialUpdate })
    ),
  });
  return addonLlm(schema, `Split multi-project dump into per-project updates.\n${text}`);
}

export async function g11LangDetect(text: string) {
  const schema = z.object({
    detectedLanguage: z.string(),
    englishDraft: z.string(),
    sourcePreserved: z.string(),
  });
  return addonLlm(schema, `Detect language and provide EN draft while preserving source.\n${text}`);
}

export async function g12EvidenceLocker(fileName: string, excerpt: string) {
  const schema = z.object({
    suggestedSection: z.string(),
    retentionHint: z.string(),
    summary: z.string(),
  });
  const scan = scanSecrets(excerpt);
  if (!scan.safe) throw new Error("Secrets detected in evidence excerpt");
  return addonLlm(
    schema,
    `Suggest section tag and retention for evidence file ${fileName}.\n${excerpt}`
  );
}
