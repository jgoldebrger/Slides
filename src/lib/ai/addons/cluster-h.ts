import { z } from "zod";
import { deckOutlineSchema } from "@/lib/validations";
import { addonLlm } from "@/lib/ai/addons/helpers";
import type { DeckOutline } from "@/types/slide";

export async function h13StakeholderMap(updates: Record<string, unknown>) {
  const schema = z.object({
    raci: z.array(
      z.object({ role: z.string(), responsible: z.string(), accountable: z.string() })
    ),
    slideSuggestion: z.string(),
  });
  return addonLlm(schema, `Infer RACI from updates.\n${JSON.stringify(updates)}`);
}

export async function h14HypothesisBet(goals: string[]) {
  const schema = z.object({
    hypotheses: z.array(z.object({ weBelieve: z.string(), soThat: z.string() })),
  });
  return addonLlm(schema, `Frame goals as hypotheses.\n${goals.join("\n")}`);
}

export async function h15AntiSlide(outline: DeckOutline) {
  const schema = z.object({
    keepAsNotes: z.array(z.object({ slideTitle: z.string(), reason: z.string() })),
  });
  return addonLlm(schema, `Flag slides that should stay notes.\n${JSON.stringify(outline)}`);
}

export async function h16TimelineLayout(milestones: unknown) {
  const schema = z.object({
    layout: z.enum(["timeline", "swimlane", "bullets"]),
    reason: z.string(),
  });
  return addonLlm(schema, `Pick timeline layout for milestones.\n${JSON.stringify(milestones)}`);
}

export async function h17ContrastSlide(before: string, after: string) {
  const schema = z.object({
    title: z.string(),
    leftColumn: z.array(z.string()),
    rightColumn: z.array(z.string()),
  });
  return addonLlm(schema, `Build contrast slide. Before: ${before}. After: ${after}`);
}

export async function h18OpenerQuestion(brief: string) {
  const schema = z.object({ question: z.string(), rationale: z.string() });
  return addonLlm(schema, `Single exec hook question from brief: ${brief}`);
}

export async function h19ParkingLot(outline: DeckOutline) {
  const schema = z.object({
    appendixSlides: z.array(z.object({ title: z.string(), summary: z.string() })),
  });
  return addonLlm(schema, `Extract parking-lot appendix from outline.\n${JSON.stringify(outline)}`);
}

export async function h20AgendaTimebox(
  outline: DeckOutline,
  totalMinutes: number
) {
  const schema = z.object({
    slides: z.array(z.object({ order: z.number(), minutes: z.number() })),
  });
  return addonLlm(
    schema,
    `Timebox ${totalMinutes} min across slides.\n${JSON.stringify(outline)}`
  );
}

export async function h21RedTeam(outline: DeckOutline) {
  const schema = z.object({
    attacks: z.array(z.object({ slide: z.string(), skepticQuestion: z.string() })),
  });
  return addonLlm(schema, `Red-team outline.\n${JSON.stringify(outline)}`);
}

export async function h22BoardOpsFork(outline: DeckOutline) {
  const schema = z.object({
    boardOutline: deckOutlineSchema,
    opsOutline: deckOutlineSchema,
  });
  return addonLlm(schema, `Fork outline for board vs ops depth.\n${JSON.stringify(outline)}`, "strong");
}

export async function h23ContinuityCheck(outline: DeckOutline) {
  const schema = z.object({
    gaps: z.array(z.object({ fromSlide: z.number(), issue: z.string() })),
  });
  return addonLlm(schema, `Check narrative continuity.\n${JSON.stringify(outline)}`);
}

export async function h24TitleAb(slideTitle: string, summary: string) {
  const schema = z.object({
    options: z.array(z.object({ title: z.string(), clarityScore: z.number() })),
  });
  return addonLlm(schema, `5 title A/B options for: ${slideTitle}. ${summary}`);
}
