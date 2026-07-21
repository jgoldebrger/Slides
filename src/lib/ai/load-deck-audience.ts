import { normalizeDeckAudience, type DeckAudience } from "@/lib/ai/audience";

type MetadataRow = { audience?: unknown } | null | undefined;

export function audienceFromDeckMetadata(metadata: unknown): DeckAudience {
  const row = metadata as MetadataRow;
  return normalizeDeckAudience(row?.audience);
}

export async function loadDeckAudience(
  supabase: { from: (table: string) => unknown },
  deckId: string
): Promise<DeckAudience> {
  const client = supabase as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: { metadata?: unknown } | null }>;
        };
      };
    };
  };

  const { data } = await client
    .from("decks")
    .select("metadata")
    .eq("id", deckId)
    .single();

  return audienceFromDeckMetadata(data?.metadata);
}
