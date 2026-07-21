"use server";

import { revalidatePath } from "next/cache";
import { getUserOrg, requireOrgEditor } from "@/lib/permissions";
import { validateBrandKitContrast } from "@/lib/brand-contrast";
import { brandKitSchema } from "@/lib/validations";
import { actionError, toPublicError } from "@/lib/errors/public-error";

export async function saveBrandKit(payload: unknown) {
  const parsed = brandKitSchema.safeParse(payload);
  if (!parsed.success) return { error: "Invalid brand kit data" };

  const contrastError = validateBrandKitContrast(
    parsed.data.primary_color,
    parsed.data.accent_color
  );
  if (contrastError) return { error: contrastError };

  const { supabase, orgId } = await requireOrgEditor();
  const { error } = await supabase.from("brand_kits").upsert(
    {
      org_id: orgId,
      name: parsed.data.name,
      primary_color: parsed.data.primary_color,
      accent_color: parsed.data.accent_color,
      font_style: parsed.data.font_style,
      ai_tone: parsed.data.ai_tone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id" }
  );

  if (error) return actionError(toPublicError(error));
  revalidatePath("/brand-kit");
  return { success: true };
}

export async function uploadBrandLogo(formData: FormData) {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided" };
  if (file.size > 2 * 1024 * 1024) return { error: "Logo must be under 2MB" };
  if (!["image/png", "image/jpeg", "image/svg+xml"].includes(file.type)) {
    return { error: "Only PNG, JPEG, and SVG logos are allowed" };
  }

  const { supabase, orgId } = await requireOrgEditor();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${orgId}/logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("brand-logos")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) return actionError(toPublicError(uploadError, "Upload failed"));

  await supabase
    .from("brand_kits")
    .upsert(
      {
        org_id: orgId,
        logo_path: path,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id" }
    );

  revalidatePath("/brand-kit");
  return { success: true, path };
}

export async function getBrandKit() {
  const { supabase, orgId } = await getUserOrg();
  const { data } = await supabase
    .from("brand_kits")
    .select("*")
    .eq("org_id", orgId)
    .single();
  return data;
}
