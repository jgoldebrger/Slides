import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplyBrandingToggle } from "@/components/decks/apply-branding-toggle";
import { DeckExportBanner } from "@/components/decks/deck-export-banner";
import { DeckGeneratingBanner } from "@/components/decks/deck-generating-banner";
import { DeckStatusBadge } from "@/components/decks/deck-status-badge";
import { SlideEditor } from "@/components/decks/slide-editor";
import { loadDeckBrandPreview } from "@/lib/brand/load-deck-brand";
import { deckPageTitle } from "@/lib/page-title";
import { mapDbSlide } from "@/lib/slides/map-db-slide";
import { getSignedStorageUrl, resolveSlideBackgroundUrl, resolveSlideImageUrl } from "@/lib/storage/images";
import { EmptyState } from "@/components/shared/state";
import { requireDeckAccess } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { redirectViewerFromDeckEdit } from "@/lib/viewer-guard";

export const maxDuration = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return deckPageTitle(id, "Editor");
}

export default async function DeckEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await redirectViewerFromDeckEdit(id);

  let deck;
  try {
    const result = await requireDeckAccess(id);
    deck = result.deck;
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

  const { applyBranding, theme: brandTheme } = await loadDeckBrandPreview(
    supabase,
    deck.org_id,
    deck.apply_branding ?? true
  );

  const deckBackgroundUrl = deck.background_image_path
    ? await getSignedStorageUrl(supabase, "slide-assets", deck.background_image_path)
    : null;

  const { data: shareLinks } = await supabase
    .from("deck_share_links")
    .select("id, label, expires_at, revoked_at, created_at")
    .eq("deck_id", id)
    .order("created_at", { ascending: false });

  const { data: revisions } = await supabase
    .from("deck_revisions")
    .select("id, revision, reason, created_at")
    .eq("deck_id", id)
    .order("revision", { ascending: false })
    .limit(20);

  const { data: latestExport } = await supabase
    .from("exports")
    .select("id, status")
    .eq("deck_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/decks/${id}/outline`}
            className="text-sm text-link underline-offset-4 hover:underline"
          >
            ← Outline
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">{deck.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <DeckStatusBadge status={deck.status} />
            <p className="text-muted-foreground">
              Edit slides, reorder, and preview.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/decks/${id}/player`}>Play</Link>
          </Button>
          <Button asChild>
            <Link href={`/decks/${id}/export`}>Export</Link>
          </Button>
        </div>
      </div>

      <DeckGeneratingBanner deckId={id} initialStatus={deck.status} />
      <DeckExportBanner
        deckId={id}
        exportId={latestExport?.id ?? null}
        initialStatus={latestExport?.status ?? null}
      />

      <ApplyBrandingToggle
        deckId={id}
        initialValue={deck.apply_branding ?? true}
        className="max-w-xl"
      />

      {mappedSlides.length === 0 ? (
        <EmptyState
          title={deck.status === "generating" ? "Generating slides" : "No slides yet"}
          description={
            deck.status === "generating"
              ? "AI is filling slide content from your approved outline."
              : "Approve an outline to create slides, or add slides manually."
          }
          action={
            deck.status === "generating" ? undefined : (
              <Button asChild>
                <Link href={`/decks/${id}/outline`}>Go to outline</Link>
              </Button>
            )
          }
        />
      ) : (
        <SlideEditor
          deckId={id}
          initialSlides={mappedSlides}
          applyBranding={applyBranding}
          brandTheme={brandTheme}
          deckBackgroundUrl={deckBackgroundUrl}
          initialShareLinks={shareLinks ?? []}
          initialRevisions={revisions ?? []}
          deckStatus={deck.status}
        />
      )}
    </div>
  );
}
