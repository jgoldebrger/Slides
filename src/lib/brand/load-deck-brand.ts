import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveBrandThemeFromKit,
  type BrandPreviewTheme,
} from "@/lib/brand";
import { getSignedStorageUrl } from "@/lib/storage/images";

export async function loadDeckBrandPreview(
  supabase: SupabaseClient,
  orgId: string,
  applyBranding: boolean
): Promise<{ applyBranding: boolean; theme: BrandPreviewTheme | null }> {
  if (!applyBranding) {
    return { applyBranding: false, theme: null };
  }

  const { data: brand } = await supabase
    .from("brand_kits")
    .select("primary_color, accent_color, font_style, logo_path")
    .eq("org_id", orgId)
    .single();

  const theme = resolveBrandThemeFromKit(brand);
  const logoUrl = brand?.logo_path
    ? await getSignedStorageUrl(supabase, "brand-logos", brand.logo_path)
    : null;

  return {
    applyBranding: true,
    theme: { ...theme, logoUrl },
  };
}
