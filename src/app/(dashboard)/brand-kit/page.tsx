import type { Metadata } from "next";
import { BrandKitForm } from "@/components/brand/brand-kit-form";
import { getBrandKit } from "@/lib/actions/brand";
import { getSignedStorageUrl } from "@/lib/storage/images";
import { redirectIfViewer } from "@/lib/viewer-guard";
import { createClient } from "@/lib/supabase/server";
import type { BrandKitInput } from "@/lib/validations";

export const metadata: Metadata = { title: "Brand kit" };

const defaults: BrandKitInput = {
  name: "Default",
  primary_color: "#171717",
  accent_color: "#2563eb",
  font_style: "sans",
};

export default async function BrandKitPage() {
  await redirectIfViewer();
  const brand = await getBrandKit();
  const supabase = await createClient();
  const logoUrl = brand?.logo_path
    ? await getSignedStorageUrl(supabase, "brand-logos", brand.logo_path)
    : null;

  const initialData = {
    name: brand?.name ?? defaults.name,
    primary_color: brand?.primary_color ?? defaults.primary_color,
    accent_color: brand?.accent_color ?? defaults.accent_color,
    font_style: (brand?.font_style ?? defaults.font_style) as BrandKitInput["font_style"],
    logo_path: brand?.logo_path,
    logo_url: logoUrl,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Brand kit</h1>
        <p className="text-muted-foreground">
          Customize colors, fonts, and logo for slide preview and export.
        </p>
      </div>
      <BrandKitForm initialData={initialData} />
    </div>
  );
}
