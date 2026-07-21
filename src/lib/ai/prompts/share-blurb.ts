import { audiencePromptHint, type DeckAudience } from "@/lib/ai/audience";

export function buildShareBlurbPrompt({
  deckName,
  deckType,
  slideTitles,
  audience = "general",
}: {
  deckName: string;
  deckType: string;
  slideTitles: string[];
  audience?: DeckAudience;
}) {
  return `Write a short email-style blurb to share a project status deck link.

Audience:
- ${audiencePromptHint(audience)}

Rules:
- One paragraph, 2-4 sentences.
- Mention the deck topic and 2-3 highlights based on slide titles only.
- Professional, inviting tone — no invented metrics.
- End with a soft call to review or discuss.

Deck: ${deckName} (${deckType})
Slide titles: ${slideTitles.join(" | ")}`;
}
