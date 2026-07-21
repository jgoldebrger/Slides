"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { getActionError } from "@/lib/action-result";
import { saveBrandKit, uploadBrandLogo } from "@/lib/actions/brand";
import {
  AUTOSAVE_DEBOUNCE_MS,
  useDebouncedEffect,
} from "@/lib/hooks/use-debounce";
import type { BrandPreviewTheme } from "@/lib/brand";
import type { BrandKitInput } from "@/lib/validations";
import { BRAND_KIT_SAMPLE_SLIDE } from "@/lib/slides/layout-theme";
import { SlidePreview } from "@/components/slides/slide-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type BrandKitFormProps = {
  initialData: BrandKitInput & {
    logo_path?: string | null;
    logo_url?: string | null;
  };
};

export function BrandKitForm({ initialData }: BrandKitFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData.name);
  const [primaryColor, setPrimaryColor] = useState(initialData.primary_color);
  const [accentColor, setAccentColor] = useState(initialData.accent_color);
  const [fontStyle, setFontStyle] = useState(initialData.font_style);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState(false);

  const previewTheme: BrandPreviewTheme = useMemo(
    () => ({
      primaryColor,
      accentColor,
      fontStyle,
      logoPath: initialData.logo_path ?? null,
      logoUrl: initialData.logo_url ?? null,
    }),
    [primaryColor, accentColor, fontStyle, initialData.logo_path, initialData.logo_url]
  );

  const persistBrandKit = useCallback(async () => {
    setSaving(true);
    const result = await saveBrandKit({
      name,
      primary_color: primaryColor,
      accent_color: accentColor,
      font_style: fontStyle,
    });
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
    } else {
      setLastSaved(true);
    }
    setSaving(false);
  }, [name, primaryColor, accentColor, fontStyle]);

  useDebouncedEffect(
    () => {
      void persistBrandKit();
    },
    [name, primaryColor, accentColor, fontStyle],
    AUTOSAVE_DEBOUNCE_MS,
    { skipFirst: true }
  );

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await persistBrandKit();
    toast.success("Brand kit saved");
  }

  async function handleLogoUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    const formData = new FormData(e.currentTarget);
    const result = await uploadBrandLogo(formData);
    const actionError = getActionError(result);
    if (actionError) {
      toast.error(actionError);
    } else {
      toast.success("Logo uploaded");
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
    setUploading(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle as="h2">Brand settings</CardTitle>
            <CardDescription>
              Colors and fonts applied to slide preview and PPTX export.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Kit name</Label>
                <Input
                  id="brand-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="primary-color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-12 cursor-pointer rounded border border-input"
                    />
                    <Input
                      id="primary-color-hex"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      pattern="^#[0-9A-Fa-f]{6}$"
                      aria-label="Primary color hex"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent-color">Accent color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      id="accent-color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-12 cursor-pointer rounded border border-input"
                    />
                    <Input
                      id="accent-color-hex"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      pattern="^#[0-9A-Fa-f]{6}$"
                      aria-label="Accent color hex"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="font-style">Font style</Label>
                <select
                  id="font-style"
                  value={fontStyle}
                  onChange={(e) =>
                    setFontStyle(e.target.value as BrandKitInput["font_style"])
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="sans">Sans-serif</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Monospace</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">
                  {saving ? "Saving…" : lastSaved ? "Saved" : "Changes autosave"}
                </span>
                <Button type="submit" disabled={saving} variant="outline">
                  {saving ? "Saving…" : "Save now"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Logo</CardTitle>
            <CardDescription>
              Shown on title slides in preview and export (PNG, JPEG, or SVG, max
              2MB).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {initialData.logo_path && (
              <p className="mb-4 text-sm text-muted-foreground">
                Current logo on file. Upload a new file to replace it.
              </p>
            )}
            <form onSubmit={handleLogoUpload} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="brand-logo-file">Logo file</Label>
                <Input
                  id="brand-logo-file"
                  name="file"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  required
                />
              </div>
              <Button type="submit" disabled={uploading}>
                {uploading ? "Uploading…" : "Upload logo"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit lg:sticky lg:top-8">
        <CardHeader>
            <CardTitle as="h2">Live preview</CardTitle>
          <CardDescription>
            Sample title slide with your current brand settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SlidePreview
            slide={BRAND_KIT_SAMPLE_SLIDE}
            applyBranding
            brandTheme={previewTheme}
          />
        </CardContent>
      </Card>
    </div>
  );
}
