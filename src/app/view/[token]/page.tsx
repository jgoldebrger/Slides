import type { Metadata } from "next";
import Link from "next/link";
import { SlidePlayer } from "@/components/decks/slide-player";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadDeckBrandPreview } from "@/lib/brand/load-deck-brand";
import { hashShareToken } from "@/lib/share/token";
import { mapDbSlide } from "@/lib/slides/map-db-slide";
import {
  getSignedStorageUrl,
  resolveSlideBackgroundUrl,
  resolveSlideImageUrl,
} from "@/lib/storage/images";
import { createAdminClient } from "@/lib/supabase/admin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  if (!token || token.length < 16) return { title: "Shared presentation" };
  try {
    const tokenHash = hashShareToken(token);
    const supabase = createAdminClient();
    const { data: link } = await supabase
      .from("deck_share_links")
      .select("deck_id")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();
    if (!link) return { title: "Link unavailable" };
    const { data: deck } = await supabase
      .from("decks")
      .select("name")
      .eq("id", link.deck_id)
      .maybeSingle();
    return {
      title: deck?.name ? `Shared — ${deck.name}` : "Shared presentation",
    };
  } catch {
    return { title: "Shared presentation" };
  }
}

function ShareUnavailable({ reason }: { reason: "invalid" | "expired" }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle as="h1">
            {reason === "expired"
              ? "This link has expired"
              : "This share link is unavailable"}
          </CardTitle>
          <CardDescription>
            {reason === "expired"
              ? "Ask the deck owner to send a new share link."
              : "This share link is invalid or was revoked. Ask the owner for a new link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/login">Sign in to UpdateDeck</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default async function SharedDeckViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 16) {
    return <ShareUnavailable reason="invalid" />;
  }

  const tokenHash = hashShareToken(token);

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return <ShareUnavailable reason="invalid" />;
  }

  const { data: anyLink } = await supabase
    .from("deck_share_links")
    .select("id, deck_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!anyLink || anyLink.revoked_at) {
    return <ShareUnavailable reason="invalid" />;
  }

  if (anyLink.expires_at && new Date(anyLink.expires_at) <= new Date()) {
    return <ShareUnavailable reason="expired" />;
  }

  const link = anyLink;

  const { data: deck } = await supabase
    .from("decks")
    .select("*")
    .eq("id", link.deck_id)
    .single();

  if (!deck) {
    return <ShareUnavailable reason="invalid" />;
  }

  const { data: slides } = await supabase
    .from("slides")
    .select("*")
    .eq("deck_id", deck.id)
    .order("order");

  const mappedSlides = await Promise.all(
    (slides ?? []).map(async (s) => {
      const slide = mapDbSlide(s);
      const imageUrl = await resolveSlideImageUrl(supabase, slide.content);
      if (imageUrl) slide.content.imageUrl = imageUrl;
      const backgroundImageUrl = await resolveSlideBackgroundUrl(
        supabase,
        slide.content
      );
      if (backgroundImageUrl) {
        slide.content.backgroundImageUrl = backgroundImageUrl;
      }
      return slide;
    })
  );

  const backgroundAudioUrl = deck.background_audio_path
    ? await getSignedStorageUrl(
        supabase,
        "slide-assets",
        deck.background_audio_path
      )
    : null;

  const backgroundImageUrl = deck.background_image_path
    ? await getSignedStorageUrl(
        supabase,
        "slide-assets",
        deck.background_image_path
      )
    : null;

  const { applyBranding, theme: brandTheme } = await loadDeckBrandPreview(
    supabase,
    deck.org_id,
    deck.apply_branding ?? true
  );

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <main
        id="main-content"
        className="min-h-screen bg-background px-4 py-6 sm:px-8"
      >
        <SlidePlayer
          deckId={deck.id}
          deckName={deck.name}
          slides={mappedSlides}
          backgroundAudioUrl={backgroundAudioUrl}
          backgroundImageUrl={backgroundImageUrl}
          viewerMode
          shareMode
          shareToken={token}
          applyBranding={applyBranding}
          brandTheme={brandTheme}
        />
      </main>
    </>
  );
}
