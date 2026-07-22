import { z } from "zod";
import {
  addonLlm,
  numbersNotInUpdates,
} from "@/lib/ai/addons/helpers";

export async function j37SelectionRewrite(
  fullText: string,
  selection: string,
  instruction: string
) {
  const schema = z.object({ rewritten: z.string() });
  const { rewritten } = await addonLlm(
    schema,
    `Rewrite ONLY this selection in context. Full: ${fullText}\nSelection: ${selection}\nInstruction: ${instruction}`
  );
  return {
    result: fullText.replace(selection, rewritten),
    rewritten,
  };
}

export async function j38VoiceMatch(sampleDeck: string, targetText: string) {
  const schema = z.object({ text: z.string() });
  return addonLlm(
    schema,
    `Match voice of sample deck.\nSample:\n${sampleDeck}\n\nRewrite:\n${targetText}`
  );
}

export async function j39JargonTranslate(text: string) {
  const schema = z.object({ text: z.string(), expansions: z.array(z.string()) });
  return addonLlm(schema, `Expand acronyms on first use.\n${text}`);
}

export async function j40ActiveVoice(text: string) {
  const schema = z.object({ text: z.string() });
  return addonLlm(schema, `Convert passive to active voice.\n${text}`);
}

export function j41NumberHighlight(
  slideText: string,
  updates: Record<string, unknown>
) {
  const ungrounded = numbersNotInUpdates(slideText, updates);
  return {
    ungroundedNumbers: ungrounded,
    highlights: ungrounded.map((n) => ({ number: n, severity: "warning" as const })),
  };
}

export async function j42CommitMessage(before: string, after: string) {
  const schema = z.object({ message: z.string() });
  return addonLlm(schema, `Summarize slide edit as commit message.\nBefore: ${before}\nAfter: ${after}`);
}

export async function j43ConflictMerge(versionA: string, versionB: string) {
  const schema = z.object({ merged: z.string(), notes: z.string() });
  return addonLlm(
    schema,
    `Merge two co-editor versions.\nA: ${versionA}\nB: ${versionB}`
  );
}

export async function j44LayoutPasteFix(wallOfText: string) {
  const schema = z.object({
    layout: z.string(),
    slides: z.array(z.object({ title: z.string(), bullets: z.array(z.string()) })),
  });
  return addonLlm(schema, `Split pasted wall into slides.\n${wallOfText}`);
}

export async function j45CommentApply(comment: string, slideContent: string) {
  const schema = z.object({ patchedContent: z.string(), summary: z.string() });
  return addonLlm(
    schema,
    `Apply human comment to slide.\nComment: ${comment}\nContent: ${slideContent}`
  );
}

export async function j46SlideTwin(
  slide: { title: string; body: string },
  candidates: Array<{ deckName: string; title: string; body: string }>
) {
  const schema = z.object({
    matches: z.array(
      z.object({ deckName: z.string(), title: z.string(), similarity: z.number() })
    ),
  });
  return addonLlm(
    schema,
    `Find similar slides to reuse.\nTarget: ${JSON.stringify(slide)}\nCandidates: ${JSON.stringify(candidates)}`
  );
}

export async function j47A11yAutofix(slide: unknown) {
  const schema = z.object({
    fixes: z.array(z.object({ issue: z.string(), fix: z.string() })),
  });
  return addonLlm(schema, `Accessibility autofix suggestions.\n${JSON.stringify(slide)}`);
}

export async function j48KillDarlings(text: string) {
  const schema = z.object({
    trimmed: z.string(),
    removedWords: z.number(),
  });
  return addonLlm(schema, `Cut 20% words without losing meaning.\n${text}`);
}