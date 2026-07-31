import { hashShareToken } from "@/lib/share/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type DeckAccessContext = { orgId: string; shareLinkId?: string };

export async function authorizeDeckAccess(
  deckId: string,
  shareToken?: string
): Promise<DeckAccessContext> {
  if (shareToken) {
    const tokenHash = hashShareToken(shareToken);
    const admin = createAdminClient();
    const { data: link } = await admin
      .from("deck_share_links")
      .select("id, deck_id, expires_at, revoked_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (
      !link ||
      link.revoked_at ||
      link.deck_id !== deckId ||
      (link.expires_at && new Date(link.expires_at) <= new Date())
    ) {
      throw Object.assign(new Error("Share link unavailable"), {
        status: 403,
      });
    }

    const { data: deck } = await admin
      .from("decks")
      .select("org_id")
      .eq("id", deckId)
      .single();

    if (!deck) {
      throw Object.assign(new Error("Deck not found"), { status: 404 });
    }
    return { orgId: deck.org_id, shareLinkId: link.id };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw Object.assign(new Error("Authentication required"), { status: 401 });
  }

  const { data: deck } = await supabase
    .from("decks")
    .select("org_id")
    .eq("id", deckId)
    .maybeSingle();

  if (!deck) {
    throw Object.assign(new Error("Deck not found"), { status: 404 });
  }

  return { orgId: deck.org_id };
}
