import { z } from "zod";
import { addonLlm } from "@/lib/ai/addons/helpers";

export async function k49Teleprompter(
  slides: Array<{ title: string; notes?: string }>,
  currentIndex: number
) {
  const current = slides[currentIndex];
  const schema = z.object({
    script: z.string(),
    scrollHints: z.array(z.string()),
  });
  return addonLlm(
    schema,
    `Teleprompter script for slide ${currentIndex + 1}: ${current?.title}. Notes: ${current?.notes ?? ""}`
  );
}

export function k50SlowDownCue(
  remainingMinutes: number,
  slidesLeft: number,
  paceMinutes: number
) {
  const needed = slidesLeft * (paceMinutes / Math.max(slidesLeft, 1));
  return {
    shouldSlowDown: needed > remainingMinutes,
    message:
      needed > remainingMinutes
        ? `Slow down — ${slidesLeft} slides in ${remainingMinutes} min`
        : "On pace",
  };
}

export async function k51RoomCaptions(narrationScript: string) {
  const schema = z.object({ captions: z.array(z.string()) });
  return addonLlm(schema, `Chunk narration into caption lines.\n${narrationScript}`);
}

export async function k52CrmNote(deckName: string, slides: unknown) {
  const schema = z.object({
    subject: z.string(),
    body: z.string(),
    nextSteps: z.array(z.string()),
  });
  return addonLlm(
    schema,
    `Salesforce/HubSpot-style CRM note after ${deckName}.\n${JSON.stringify(slides)}`
  );
}

export async function k53AssigneeGuess(
  nextSteps: string[],
  roster: string[]
) {
  const schema = z.object({
    assignments: z.array(z.object({ task: z.string(), owner: z.string() })),
  });
  return addonLlm(
    schema,
    `Guess owners from roster ${roster.join(", ")}.\nTasks: ${nextSteps.join("\n")}`
  );
}

export async function k54ShareGate(audience: string, deckName: string) {
  const schema = z.object({
    blurb: z.string(),
    passwordHint: z.string(),
    expiryDays: z.number(),
  });
  return addonLlm(schema, `Share gate suggestions for ${audience} viewing ${deckName}`);
}

export async function k55ViewAnalytics(
  views: Array<{ slideIndex: number; seconds: number }>
) {
  const top = [...views].sort((a, b) => b.seconds - a.seconds)[0];
  const schema = z.object({
    narrative: z.string(),
    coaching: z.array(z.string()),
  });
  return addonLlm(
    schema,
    `Narrate view analytics. Longest slide: ${top?.slideIndex ?? 0} (${top?.seconds ?? 0}s).\n${JSON.stringify(views)}`
  );
}

export async function k56AsyncVideoScript(deckName: string, slides: unknown) {
  const schema = z.object({
    sections: z.array(z.object({ slideTitle: z.string(), script: z.string() })),
  });
  return addonLlm(schema, `Loom-style async video script for ${deckName}.\n${JSON.stringify(slides)}`);
}

export async function k57QaParkingExport(unanswered: string[]) {
  const schema = z.object({
    backlogIssues: z.array(z.object({ title: z.string(), description: z.string() })),
  });
  return addonLlm(schema, `Export unanswered Q&A to backlog.\n${unanswered.join("\n")}`);
}

export async function k58DecisionLog(slides: unknown) {
  const schema = z.object({
    decisions: z.array(z.object({ decision: z.string(), owner: z.string(), date: z.string() })),
    onePager: z.string(),
  });
  return addonLlm(schema, `Decision log one-pager.\n${JSON.stringify(slides)}`);
}

export async function k59ReminderDrip(risks: string[]) {
  const schema = z.object({
    reminders: z.array(z.object({ when: z.string(), message: z.string() })),
  });
  return addonLlm(schema, `Schedule update nudges from risks.\n${risks.join("\n")}`);
}

export async function k60ReplayChapters(
  slides: Array<{ title: string }>,
  durationSec: number
) {
  const chunk = Math.floor(durationSec / Math.max(slides.length, 1));
  return {
    chapters: slides.map((s, i) => ({
      title: s.title,
      startSec: i * chunk,
      endSec: (i + 1) * chunk,
    })),
  };
}
