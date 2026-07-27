import { z } from "zod";
import { sourceCitationSchema } from "@/lib/ai/citations";

export const COPILOT_MODES = ["plan", "edit", "present", "research"] as const;
export type CopilotMode = (typeof COPILOT_MODES)[number];

export const REGENERATE_SCOPES = [
  "claim",
  "bullet",
  "slide",
  "section",
  "deck",
] as const;
export type RegenerateScope = (typeof REGENERATE_SCOPES)[number];

export const AGENT_TYPES = [
  "friday",
  "refresh",
  "approval",
  "risk_watch",
  "brand_drift",
] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

export const CONNECTOR_TYPES = [
  "slack",
  "jira",
  "linear",
  "email",
  "github",
  "notion",
] as const;
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

export const copilotModeSchema = z.enum(COPILOT_MODES);

export const contextSnapshotSchema = z.object({
  capturedAt: z.string(),
  projectName: z.string().optional(),
  includedSections: z.array(z.string()).optional(),
  deckBrief: z.string().optional(),
  slideCount: z.number().optional(),
  updateFields: z.array(z.string()).optional(),
  promptExcerpt: z.string().max(2000).optional(),
});

export type ContextSnapshot = z.infer<typeof contextSnapshotSchema>;

export const slideCitationMapSchema = z.record(
  z.string(),
  z.array(sourceCitationSchema)
);

export type SlideCitationMap = z.infer<typeof slideCitationMapSchema>;

export const toolTraceSchema = z.object({
  action: z.string(),
  target: z.string().optional(),
  summary: z.string(),
  at: z.string(),
});

export type ToolTrace = z.infer<typeof toolTraceSchema>;

export const promptLibraryEntrySchema = z.object({
  name: z.string().min(1).max(120),
  body: z.string().min(1).max(4000),
  tags: z.array(z.string().max(40)).max(10).optional(),
  scope: z.enum(["personal", "org"]).default("personal"),
});

export const aiFeedbackSchema = z.object({
  deckId: z.string().uuid().optional(),
  slideId: z.string().uuid().optional(),
  generationId: z.string().uuid().optional(),
  featureId: z.string().optional(),
  rating: z.union([z.literal(-1), z.literal(1)]),
  correction: z.string().max(1000).optional(),
});

export const scopedRegenerateSchema = z.object({
  deckId: z.string().uuid(),
  slideId: z.string().uuid().optional(),
  scope: z.enum(REGENERATE_SCOPES),
  instruction: z.string().max(500).optional(),
  keepEdits: z.boolean().optional(),
  creativity: z.enum(["deterministic", "balanced", "exploratory"]).optional(),
});

export const agentConfigSchema = z.object({
  enabled: z.boolean(),
  scheduleCron: z.string().max(100).optional(),
  budgetRunsPerWeek: z.number().int().min(1).max(100).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const connectorConfigSchema = z.object({
  enabled: z.boolean(),
  name: z.string().min(1).max(120),
  config: z.record(z.string(), z.unknown()).optional(),
});
