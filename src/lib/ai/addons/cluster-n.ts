import { z } from "zod";
import { projectUpdateSchema } from "@/lib/validations";
import { addonLlm } from "@/lib/ai/addons/helpers";

const partialUpdate = projectUpdateSchema.partial();

export async function n85SlackStatus(outline: unknown, channel: string) {
  const schema = z.object({
    message: z.string(),
    votePrompt: z.string(),
  });
  return addonLlm(
    schema,
    `Draft Slack /status post for #${channel} with emoji vote.\n${JSON.stringify(outline)}`
  );
}

export async function n86TeamsCard(deckName: string, outline: unknown) {
  const schema = z.object({
    title: z.string(),
    body: z.string(),
    actions: z.array(z.object({ label: z.string(), action: z.string() })),
  });
  return addonLlm(schema, `Teams Adaptive Card to approve ${deckName}.\n${JSON.stringify(outline)}`);
}

export async function n87TicketAutolink(slideText: string) {
  const schema = z.object({
    links: z.array(z.object({ ticketId: z.string(), url: z.string(), label: z.string() })),
  });
  return addonLlm(schema, `Extract Jira/Linear ticket refs.\n${slideText}`);
}

export async function n88GithubReleases(releaseNotes: string) {
  return addonLlm(
    partialUpdate,
    `Map GitHub release notes to progress updates.\n${releaseNotes}`
  );
}

export async function n89MeetSummary(transcript: string) {
  return addonLlm(partialUpdate, `Zoom/Meet summary to update fields.\n${transcript}`);
}

export async function n90WebhookIntake(payload: Record<string, unknown>) {
  return addonLlm(
    partialUpdate,
    `Parse Zapier/Make webhook payload.\n${JSON.stringify(payload)}`
  );
}

export async function n91ChromeClip(pageText: string, url: string) {
  return addonLlm(
    partialUpdate,
    `Clip web page into project updates. URL: ${url}\n${pageText}`
  );
}

export async function n92MobileVoice(transcript: string, projectName: string) {
  return addonLlm(
    partialUpdate,
    `Mobile voice capture for ${projectName}.\n${transcript}`
  );
}

export async function n93FridayAgent(projectName: string, updates: unknown) {
  const schema = z.object({
    steps: z.array(z.object({ step: z.string(), status: z.string() })),
    outlineReady: z.boolean(),
    qaNotes: z.array(z.string()),
  });
  return addonLlm(
    schema,
    `Friday deck agent plan for ${projectName}.\n${JSON.stringify(updates)}`,
    "strong"
  );
}

export async function n94ApprovalAgent(
  deckName: string,
  reviewers: string[]
) {
  const schema = z.object({
    routing: z.array(z.object({ reviewer: z.string(), reason: z.string() })),
    message: z.string(),
  });
  return addonLlm(
    schema,
    `Approval workflow for ${deckName}. Reviewers: ${reviewers.join(", ")}`
  );
}
