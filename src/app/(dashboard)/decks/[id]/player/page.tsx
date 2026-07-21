import { notFound } from "next/navigation";
import { SlidePlayer } from "@/components/decks/slide-player";
import { loadDeckBrandPreview } from "@/lib/brand/load-deck-brand";
import { deckPageTitle } from "@/lib/page-title";
import { mapDbSlide } from "@/lib/slides/map-db-slide";
import { getSignedStorageUrl, resolveSlideBackgroundUrl, resolveSlideImageUrl } from "@/lib/storage/images";
import { requireDeckAccess } from "@/lib/permissions";
import { isViewerRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return deckPageTitle(id, "Player");
}

export default async function DeckPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let deck;
  let viewerMode = false;
  try {
    const result = await requireDeckAccess(id);
    deck = result.deck;
    viewerMode = isViewerRole(result.role);
  } catch {
    notFound();
  }

  const supabase = await createClient();
  const { data: slides } = await supabase
    .from("slides")
    .select("*")
    .eq("deck_id", id)
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
    ? await getSignedStorageUrl(supabase, "slide-assets", deck.background_audio_path)
    : null;

  const backgroundImageUrl = deck.background_image_path
    ? await getSignedStorageUrl(supabase, "slide-assets", deck.background_image_path)
    : null;

  const { applyBranding, theme: brandTheme } = await loadDeckBrandPreview(
    supabase,
    deck.org_id,
    deck.apply_branding ?? true
  );

  return (
    <SlidePlayer
      deckId={id}
      deckName={deck.name}
      slides={mappedSlides}
      backgroundAudioUrl={backgroundAudioUrl}
      backgroundImageUrl={backgroundImageUrl}
      viewerMode={viewerMode}
      applyBranding={applyBranding}
      brandTheme={brandTheme}
    />
  );
}
