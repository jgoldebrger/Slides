import type { BrandPreviewTheme } from "@/lib/brand";
import { getPreviewFontClass } from "@/lib/brand";
import {
  resolveSlideColors,
} from "@/lib/slides/layout-theme";
import { assertLayoutContractsComplete } from "@/lib/slides/layout-contract";
import type { Slide, SlideLayout } from "@/types/slide";
import { cn } from "@/lib/utils";
import { SlideChartPreview } from "@/components/slides/slide-chart-preview";

assertLayoutContractsComplete();

type SlidePreviewProps = {
  slide: Slide;
  className?: string;
  applyBranding?: boolean;
  brandTheme?: BrandPreviewTheme | null;
  deckBackgroundUrl?: string | null;
};

type SlideColors = {
  primary: string;
  accent: string;
  muted: string;
  border: string;
};

function PreviewSlideImage({
  imageUrl,
  imageAlt,
  title,
  className,
  maxHeight = "max-h-40",
}: {
  imageUrl?: string;
  imageAlt?: string;
  title: string;
  className?: string;
  maxHeight?: string;
}) {
  if (!imageUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={imageAlt ?? title}
      className={cn("max-w-full object-contain", maxHeight, className)}
    />
  );
}

function PreviewBulletList({
  items,
  className,
  mutedStyle,
}: {
  items: string[];
  className?: string;
  mutedStyle: React.CSSProperties;
}) {
  if (!items.length) return null;
  return (
    <ul
      className={cn("list-disc space-y-2 pl-5 text-sm", className)}
      style={mutedStyle}
    >
      {items.map((bullet, i) => (
        <li key={i}>{bullet}</li>
      ))}
    </ul>
  );
}

export function SlidePreview({
  slide,
  className,
  applyBranding = false,
  brandTheme = null,
  deckBackgroundUrl = null,
}: SlidePreviewProps) {
  const { layout, title, content } = slide;
  const colors = resolveSlideColors(applyBranding, brandTheme);
  const fontClass = applyBranding && brandTheme
    ? getPreviewFontClass(brandTheme.fontStyle)
    : "font-sans";

  const backgroundUrl =
    content.backgroundImageUrl ?? deckBackgroundUrl ?? undefined;

  return (
    <div
      className={cn(
        "slide-enter relative aspect-video w-full overflow-hidden rounded-lg border shadow-sm",
        fontClass,
        className
      )}
      style={{ borderColor: colors.border }}
    >
      {backgroundUrl && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundUrl})` }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-white/82" aria-hidden />
        </>
      )}
      <div
        className={cn(
          "relative z-10 h-full p-8",
          backgroundUrl ? "bg-transparent" : "bg-white"
        )}
      >
      {applyBranding && (
        <div
          className="mb-4 h-1 w-16 rounded-full"
          style={{ backgroundColor: colors.primary }}
          aria-hidden
        />
      )}
      <SlideLayoutContent
        layout={layout}
        title={title}
        content={content}
        colors={colors}
        logoUrl={applyBranding ? brandTheme?.logoUrl : null}
      />
      </div>
    </div>
  );
}

function SlideLayoutContent({
  layout,
  title,
  content,
  colors,
  logoUrl,
}: {
  layout: SlideLayout;
  title: string;
  content: Slide["content"];
  colors: SlideColors;
  logoUrl?: string | null;
}) {
  const titleStyle = { color: colors.primary };
  const accentStyle = { color: colors.accent };
  const mutedClass = "text-sm";
  const mutedStyle = { color: colors.muted };

  switch (layout) {
    case "title":
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="mb-6 max-h-16 max-w-[200px] object-contain"
            />
          )}
          <h2 className="text-3xl font-bold tracking-tight" style={titleStyle}>
            {title}
          </h2>
          {content.body && (
            <p className="mt-4 text-lg" style={mutedStyle}>
              {content.body}
            </p>
          )}
        </div>
      );

    case "section_break":
      return (
        <div
          className="flex h-full items-center border-l-4 pl-6"
          style={{ borderColor: colors.primary }}
        >
          <h2 className="text-2xl font-semibold" style={titleStyle}>
            {title}
          </h2>
        </div>
      );

    case "bullets": {
      const bullets = content.bullets ?? [];
      if (content.imageUrl) {
        return (
          <div className="flex h-full flex-col">
            <h2 className="mb-4 text-xl font-semibold" style={titleStyle}>
              {title}
            </h2>
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
              <div className="min-h-0 overflow-auto">
                <PreviewBulletList items={bullets} mutedStyle={mutedStyle} />
                {content.body && (
                  <p className="mt-3 text-sm" style={mutedStyle}>
                    {content.body}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center rounded-lg bg-muted/30 p-2">
                <PreviewSlideImage
                  imageUrl={content.imageUrl}
                  imageAlt={content.imageAlt}
                  title={title}
                  maxHeight="max-h-full"
                  className="h-full"
                />
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="flex h-full flex-col">
          <h2 className="mb-4 text-xl font-semibold" style={titleStyle}>
            {title}
          </h2>
          <PreviewBulletList items={bullets} mutedStyle={mutedStyle} />
          {content.body && (
            <p className="mt-3 text-sm" style={mutedStyle}>
              {content.body}
            </p>
          )}
        </div>
      );
    }

    case "metrics_grid": {
      const metrics = content.metrics ?? [];
      const fallbackBullets =
        metrics.length === 0 ? (content.bullets ?? []) : [];
      return (
        <div className="flex h-full flex-col">
          <h2 className="mb-4 text-xl font-semibold" style={titleStyle}>
            {title}
          </h2>
          {metrics.length > 0 ? (
            <div className="grid flex-1 grid-cols-2 gap-4">
              {metrics.map((metric, i) => (
                <div
                  key={i}
                  className="rounded-lg border p-4 text-center"
                  style={{ borderColor: colors.border }}
                >
                  <p className="text-2xl font-bold" style={accentStyle}>
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs" style={mutedStyle}>
                    {metric.label}
                  </p>
                  {metric.trend && (
                    <span className="mt-1 text-xs capitalize text-muted-foreground">
                      {metric.trend}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <PreviewBulletList items={fallbackBullets} mutedStyle={mutedStyle} />
          )}
          {!metrics.length && !fallbackBullets.length && content.body && (
            <p className="text-sm" style={mutedStyle}>
              {content.body}
            </p>
          )}
        </div>
      );
    }

    case "timeline":
      return (
        <div className="flex h-full flex-col">
          <h2 className="mb-4 text-xl font-semibold" style={titleStyle}>
            {title}
          </h2>
          <div className="space-y-3">
            {(content.bullets ?? []).map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: colors.primary }}
                />
                <p className={mutedClass} style={mutedStyle}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      );

    case "two_column": {
      const bullets = content.bullets ?? [];
      const mid = Math.ceil(bullets.length / 2);
      const left = bullets.slice(0, mid);
      const right = bullets.slice(mid);

      if (content.imageUrl) {
        return (
          <div className="flex h-full flex-col">
            <h2 className="mb-4 text-xl font-semibold" style={titleStyle}>
              {title}
            </h2>
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
              <div className="min-h-0 overflow-auto">
                <PreviewBulletList
                  items={left.length ? left : bullets}
                  mutedStyle={mutedStyle}
                />
                {content.body && (
                  <p className="mt-3 text-sm" style={mutedStyle}>
                    {content.body}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-1 items-center justify-center rounded-lg bg-muted/30 p-2">
                  <PreviewSlideImage
                    imageUrl={content.imageUrl}
                    imageAlt={content.imageAlt}
                    title={title}
                    maxHeight="max-h-full"
                  />
                </div>
                {right.length > 0 && (
                  <PreviewBulletList items={right} mutedStyle={mutedStyle} />
                )}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="flex h-full flex-col">
          <h2 className="mb-4 text-xl font-semibold" style={titleStyle}>
            {title}
          </h2>
          <div className="grid flex-1 grid-cols-2 gap-6">
            <PreviewBulletList items={left} mutedStyle={mutedStyle} />
            <PreviewBulletList items={right} mutedStyle={mutedStyle} />
          </div>
          {content.body && (
            <p className="mt-3 text-sm" style={mutedStyle}>
              {content.body}
            </p>
          )}
        </div>
      );
    }

    case "image_caption":
      return (
        <div className="flex h-full flex-col">
          <h2 className="mb-4 text-xl font-semibold" style={titleStyle}>
            {title}
          </h2>
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
            <div className="min-h-0 overflow-auto">
              <PreviewBulletList
                items={content.bullets ?? []}
                mutedStyle={mutedStyle}
              />
              {content.body && (
                <p className="text-sm" style={mutedStyle}>
                  {content.body}
                </p>
              )}
            </div>
            <div
              className="flex items-center justify-center rounded-lg p-2"
              style={{ backgroundColor: `${colors.border}80` }}
            >
              {content.imageUrl ? (
                <PreviewSlideImage
                  imageUrl={content.imageUrl}
                  imageAlt={content.imageAlt}
                  title={title}
                  maxHeight="max-h-full"
                />
              ) : (
                <span className="text-sm opacity-50">Image placeholder</span>
              )}
            </div>
          </div>
        </div>
      );

    case "chart": {
      const hasChart =
        Array.isArray(content.chartData) && content.chartData.length > 0;
      const hasMetrics =
        Array.isArray(content.metrics) && content.metrics.length > 0;
      return (
        <div className="flex h-full flex-col">
          <h2 className="mb-4 text-xl font-semibold" style={titleStyle}>
            {title}
          </h2>
          {hasChart || hasMetrics ? (
            <SlideChartPreview
              chartData={content.chartData}
              metrics={content.metrics}
              primaryColor={colors.primary}
              mutedColor={colors.muted}
            />
          ) : (
            <PreviewBulletList
              items={content.bullets ?? []}
              mutedStyle={mutedStyle}
            />
          )}
          {content.body && (
            <p className="mt-2 text-xs" style={mutedStyle}>
              {content.body}
            </p>
          )}
        </div>
      );
    }

    case "quote":
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <blockquote className="text-xl font-medium italic" style={mutedStyle}>
            &ldquo;{content.quote ?? content.body ?? title}&rdquo;
          </blockquote>
          {content.attribution && (
            <p className="mt-4 text-sm" style={mutedStyle}>
              — {content.attribution}
            </p>
          )}
        </div>
      );

    default:
      return (
        <div className="flex h-full flex-col">
          <h2 className="text-xl font-semibold" style={titleStyle}>
            {title}
          </h2>
          {content.body && (
            <p className="mt-4 text-sm" style={mutedStyle}>
              {content.body}
            </p>
          )}
        </div>
      );
  }
}
