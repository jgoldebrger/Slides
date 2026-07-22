import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { buildMeetingNotesPrompt } from "@/lib/ai/prompts/meeting-notes";
import { projectUpdateSchema } from "@/lib/validations";

const intakeUpdateSchema = projectUpdateSchema.partial();

export async function parseVoiceTranscriptToUpdates(
  projectName: string,
  transcript: string
) {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: intakeUpdateSchema,
    prompt: buildMeetingNotesPrompt({ projectName, notes: transcript }),
  });
  return object;
}

export async function parseOcrTextToUpdates(
  projectName: string,
  ocrText: string
) {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: intakeUpdateSchema,
    prompt: `Extract project update fields from OCR text for ${projectName}. Use only visible text.\n\n${ocrText}`,
  });
  return object;
}

export async function suggestGapFillUpdates(
  projectName: string,
  updates: Record<string, unknown>,
  deckType: string
) {
  const schema = z.object({
    missingSections: z.array(z.string()),
    suggestions: z.array(
      z.object({
        field: z.string(),
        draft: z.string(),
      })
    ),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `For a ${deckType} deck on ${projectName}, identify empty update sections and suggest short drafts. Updates: ${JSON.stringify(updates)}`,
  });
  return object;
}

export async function runInterviewTurn(
  projectName: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
) {
  const schema = z.object({
    reply: z.string(),
    extractedUpdates: intakeUpdateSchema.optional(),
    done: z.boolean(),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Stakeholder interview for ${projectName}. History: ${JSON.stringify(history)}. User: ${userMessage}. Ask one follow-up or extract updates when complete.`,
  });
  return object;
}

export async function detectMaterialUpdateChange(
  previous: Record<string, unknown>,
  current: Record<string, unknown>
) {
  const schema = z.object({
    material: z.boolean(),
    summary: z.string(),
    suggestedDeckRefresh: z.boolean(),
  });
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema,
    prompt: `Compare project updates. Previous: ${JSON.stringify(previous)}. Current: ${JSON.stringify(current)}.`,
  });
  return object;
}

export async function parseSlackDigest(text: string, projectName: string) {
  return parseVoiceTranscriptToUpdates(projectName, `Slack thread:\n${text}`);
}

export async function parseJiraExport(text: string, projectName: string) {
  return parseVoiceTranscriptToUpdates(projectName, `Jira export:\n${text}`);
}

export async function parseEmailBody(text: string, projectName: string) {
  return parseVoiceTranscriptToUpdates(projectName, `Email:\n${text}`);
}

export async function mergeMultiSourceIntake(
  projectName: string,
  sources: Record<string, string>
) {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: intakeUpdateSchema,
    prompt: `Merge these sources into one project update for ${projectName}. Resolve conflicts conservatively.\n${JSON.stringify(sources)}`,
  });
  return object;
}
