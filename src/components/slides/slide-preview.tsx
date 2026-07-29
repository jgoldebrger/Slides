import type { BrandPreviewTheme } from "@/lib/brand";
import { getPreviewFontClass } from "@/lib/brand";
import {
  resolveSlideColors,
} from "@/lib/slides/layout-theme";
import { assertLayoutContractsComplete } from "@/lib/slides/layout-contract";
import type { Slide, SlideLayout } from "@/types/slide";
import { cn } from "@/lib/utils";
import { SlideChartPreview } from "@/components/slides/slide-chart-preview";
import { RichTextContent } from "@/components/slides/rich-text-content";
import {
  parseSlideAnimation,
  slideAnimationClass,
  type SlideEntranceAnimation,
} from "@/lib/slides/animations";

assertLayoutContractsComplete();

type SlidePreviewProps = {
  slide: Slide;
  className?: string;
  applyBranding?: boolean;
  brandTheme?: BrandPreviewTheme | null;
  deckBackgroundUrl?: string | null;
  onImageClick?: () => void;
  /** Replay entrance animation (change between renders). */
  animationRunId?: string | number;
  /** When set, only show this many bullets (player step-through). */
  visibleBulletCount?: number;
  /** Apply entrance animation from slide metadata. */
  playAnimations?: boolean;
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
  onClick,
}: {
  imageUrl?: string;
  imageAlt?: string;
  title: string;
  className?: string;
  maxHeight?: string;
  onClick?: () => void;
}) {
  if (!imageUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={imageAlt ?? title}
      className={cn(
        "max-w-full object-contain",
        maxHeight,
        onClick && "cursor-pointer transition-opacity hover:opacity-90",
        className
      )}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={onClick ? "Click to annotate" : undefined}
    />
  );
}

function PreviewBulletList({
  items,
  className,
  mutedStyle,
  visibleBulletCount,
  staggerAnimation,
}: {
  items: string[];
  className?: string;
  mutedStyle: React.CSSProperties;
  visibleBulletCount?: number;
  staggerAnimation?: boolean;
}) {
  const visible =
    visibleBulletCount != null ? items.slice(0, visibleBulletCount) : items;
  if (!visible.length) return null;
  return (
    <ul
      className={cn(
        "list-disc space-y-2 pl-5 text-sm",
        staggerAnimation && visibleBulletCount == null && "slide-bullet-stagger",
        className
      )}
      style={mutedStyle}
    >
      {visible.map((bullet, i) => (
        <li key={i}>
          <RichTextContent html={bullet} />
        </li>
      ))}
    </ul>
  );
}

const CONTENT_ANIM_DELAY = {
  title: 0,
  body: 100,
  bullets: 180,
  image: 260,
  metricBase: 200,
} as const;

function AnimatedBlock({
  children,
  play,
  entrance,
  animateContent,
  delayMs = 0,
  className,
}: {
  children: React.ReactNode;
  play: boolean;
  entrance: SlideEntranceAnimation;
  animateContent: boolean;
  delayMs?: number;
  className?: string;
}) {
  if (!play || entrance === "none" || !animateContent) {
    if (className) return <div className={className}>{children}</div>;
    return <>{children}</>;
  }
  return (
    <div
      className={cn(slideAnimationClass(entrance), className)}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {children}
    </div>
  );
}

export function SlidePreview({
  slide,
  className,
  applyBranding = false,
  brandTheme = null,
  deckBackgroundUrl = null,
  onImageClick,
  animationRunId = 0,
  visibleBulletCount,
  playAnimations = false,
}: SlidePreviewProps) {
  const { layout, title, content } = slide;
  const animation = parseSlideAnimation(slide.metadata);
  const animateWholeSlide =
    playAnimations &&
    animation.entrance !== "none" &&
    !animation.animateContent;
  const entranceClass = animateWholeSlide
    ? slideAnimationClass(animation.entrance)
    : undefined;
  const colors = resolveSlideColors(applyBranding, brandTheme);
  const fontClass = applyBranding && brandTheme
    ? getPreviewFontClass(brandTheme.fontStyle)
    : "font-sans";

  const backgroundUrl =
    content.backgroundImageUrl ?? deckBackgroundUrl ?? undefined;

  const useDefaultEnter = !playAnimations || animation.entrance === "none";

  return (
    <div
      className={cn(
        "relative aspect-video w-full overflow-hidden rounded-lg border shadow-sm",
        useDefaultEnter && "slide-enter",
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
      <div
        key={`${slide.id}-${animationRunId}`}
        className={cn("h-full", entranceClass)}
      >
      <SlideLayoutContent
        layout={layout}
        title={title}
        content={content}
        colors={colors}
        logoUrl={applyBranding ? brandTheme?.logoUrl : null}
        onImageClick={onImageClick}
        visibleBulletCount={visibleBulletCount}
        staggerBullets={
          playAnimations && animation.staggerBullets && visibleBulletCount == null
        }
        playAnimations={playAnimations}
        entrance={animation.entrance}
        animateContent={animation.animateContent}
      />
      </div>
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
  onImageClick,
  visibleBulletCount,
  staggerBullets = false,
  playAnimations = false,
  entrance = "none",
  animateContent = true,
}: {
  layout: SlideLayout;
  title: string;
  content: Slide["content"];
  colors: SlideColors;
  logoUrl?: string | null;
  onImageClick?: () => void;
  visibleBulletCount?: number;
  staggerBullets?: boolean;
  playAnimations?: boolean;
  entrance?: SlideEntranceAnimation;
  animateContent?: boolean;
}) {
  const titleStyle = { color: colors.primary };
  const accentStyle = { color: colors.accent };
  const mutedClass = "text-sm";
  const mutedStyle = { color: colors.muted };

  const block = (
    node: React.ReactNode,
    delayMs: number,
    className?: string
  ) => (
    <AnimatedBlock
      play={playAnimations}
      entrance={entrance}
      animateContent={animateContent}
      delayMs={delayMs}
      className={className}
    >
      {node}
    </AnimatedBlock>
  );

  const renderTitle = (className: string) =>
    block(
      <h2 className={className} style={titleStyle}>
        <RichTextContent html={title} />
      </h2>,
      CONTENT_ANIM_DELAY.title
    );

  const renderBody = (className: string, html: string) =>
    block(
      <p className={className} style={mutedStyle}>
        <RichTextContent html={html} />
      </p>,
      CONTENT_ANIM_DELAY.body
    );

  const renderBullets = (
    items: string[],
    options?: { className?: string; applyStep?: boolean }
  ) =>
    block(
      <PreviewBulletList
        items={items}
        mutedStyle={mutedStyle}
        className={options?.className}
        visibleBulletCount={
          options?.applyStep === false ? undefined : visibleBulletCount
        }
        staggerAnimation={staggerBullets}
      />,
      CONTENT_ANIM_DELAY.bullets
    );

  const renderImage = (imageUrl: string, options: {
    imageAlt?: string;
    maxHeight?: string;
    className?: string;
    wrapperClassName?: string;
  }) =>
    block(
      <div className={options.wrapperClassName}>
        <PreviewSlideImage
          imageUrl={imageUrl}
          imageAlt={options.imageAlt}
          title={title}
          maxHeight={options.maxHeight}
          className={options.className}
          onClick={onImageClick}
        />
      </div>,
      CONTENT_ANIM_DELAY.image
    );

  switch (layout) {
    case "title":
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          {logoUrl &&
            block(
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="mb-6 max-h-16 max-w-[200px] object-contain"
              />,
              0
            )}
          {renderTitle("text-3xl font-bold tracking-tight")}
          {content.body ? renderBody("mt-4 text-lg", content.body) : null}
        </div>
      );

    case "section_break":
      return (
        <div
          className="flex h-full items-center border-l-4 pl-6"
          style={{ borderColor: colors.primary }}
        >
          {renderTitle("text-2xl font-semibold")}
        </div>
      );

    case "bullets": {
      const allBullets = content.bullets ?? [];
      const bullets =
        visibleBulletCount != null
          ? allBullets.slice(0, visibleBulletCount)
          : allBullets;
      if (content.imageUrl) {
        return (
          <div className="flex h-full flex-col">
            {renderTitle("mb-4 text-xl font-semibold")}
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
              <div className="min-h-0 overflow-auto">
                {renderBullets(bullets)}
                {content.body
                  ? renderBody("mt-3 text-sm", content.body)
                  : null}
              </div>
              {renderImage(content.imageUrl, {
                imageAlt: content.imageAlt,
                maxHeight: "max-h-full",
                className: "h-full",
                wrapperClassName:
                  "flex items-center justify-center rounded-lg bg-muted/30 p-2",
              })}
            </div>
          </div>
        );
      }
      return (
        <div className="flex h-full flex-col">
          {renderTitle("mb-4 text-xl font-semibold")}
          {renderBullets(bullets)}
          {content.body ? renderBody("mt-3 text-sm", content.body) : null}
        </div>
      );
    }

    case "metrics_grid": {
      const metrics = content.metrics ?? [];
      const fallbackBullets =
        metrics.length === 0 ? (content.bullets ?? []) : [];
      return (
        <div className="flex h-full flex-col">
          {renderTitle("mb-4 text-xl font-semibold")}
          {metrics.length > 0 ? (
            <div className="grid flex-1 grid-cols-2 gap-4">
              {metrics.map((metric, i) =>
                block(
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
                    {metric.trend ? (
                      <span className="mt-1 text-xs capitalize text-muted-foreground">
                        {metric.trend}
                      </span>
                    ) : null}
                  </div>,
                  CONTENT_ANIM_DELAY.metricBase + i * 80
                )
              )}
            </div>
          ) : (
            renderBullets(fallbackBullets)
          )}
          {!metrics.length && !fallbackBullets.length && content.body
            ? renderBody("text-sm", content.body)
            : null}
        </div>
      );
    }

    case "timeline": {
      const timelineItems =
        visibleBulletCount != null
          ? (content.bullets ?? []).slice(0, visibleBulletCount)
          : (content.bullets ?? []);
      return (
        <div className="flex h-full flex-col">
          {renderTitle("mb-4 text-xl font-semibold")}
          {block(
            <div
              className={cn(
                "space-y-3",
                staggerBullets && "slide-bullet-stagger"
              )}
            >
              {timelineItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <p className={mutedClass} style={mutedStyle}>
                    <RichTextContent html={item} />
                  </p>
                </div>
              ))}
            </div>,
            CONTENT_ANIM_DELAY.bullets
          )}
        </div>
      );
    }

    case "two_column": {
      const allBullets = content.bullets ?? [];
      const bullets =
        visibleBulletCount != null
          ? allBullets.slice(0, visibleBulletCount)
          : allBullets;
      const mid = Math.ceil(bullets.length / 2);
      const left = bullets.slice(0, mid);
      const right = bullets.slice(mid);

      if (content.imageUrl) {
        return (
          <div className="flex h-full flex-col">
            {renderTitle("mb-4 text-xl font-semibold")}
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
              <div className="min-h-0 overflow-auto">
                {renderBullets(left.length ? left : bullets)}
                {content.body
                  ? renderBody("mt-3 text-sm", content.body)
                  : null}
              </div>
              <div className="flex flex-col gap-3">
                {renderImage(content.imageUrl, {
                  imageAlt: content.imageAlt,
                  maxHeight: "max-h-full",
                  wrapperClassName:
                    "flex flex-1 items-center justify-center rounded-lg bg-muted/30 p-2",
                })}
                {right.length > 0
                  ? renderBullets(right, { applyStep: false })
                  : null}
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="flex h-full flex-col">
          {renderTitle("mb-4 text-xl font-semibold")}
          <div className="grid flex-1 grid-cols-2 gap-6">
            {renderBullets(left, { applyStep: false })}
            {renderBullets(right, { applyStep: false })}
          </div>
          {content.body ? renderBody("mt-3 text-sm", content.body) : null}
        </div>
      );
    }

    case "image_caption":
      return (
        <div className="flex h-full flex-col">
          {renderTitle("mb-4 text-xl font-semibold")}
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-4">
            <div className="min-h-0 overflow-auto">
              {renderBullets(content.bullets ?? [])}
              {content.body ? renderBody("text-sm", content.body) : null}
            </div>
            {content.imageUrl
              ? renderImage(content.imageUrl, {
                  imageAlt: content.imageAlt,
                  maxHeight: "max-h-full",
                  wrapperClassName:
                    "flex items-center justify-center rounded-lg p-2",
                })
              : block(
                  <div
                    className="flex items-center justify-center rounded-lg p-2"
                    style={{ backgroundColor: `${colors.border}80` }}
                  >
                    <span className="text-sm opacity-50">Image placeholder</span>
                  </div>,
                  CONTENT_ANIM_DELAY.image
                )}
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
          {renderTitle("mb-4 text-xl font-semibold")}
          {hasChart || hasMetrics
            ? block(
                <SlideChartPreview
                  chartData={content.chartData}
                  metrics={content.metrics}
                  primaryColor={colors.primary}
                  mutedColor={colors.muted}
                />,
                CONTENT_ANIM_DELAY.bullets
              )
            : renderBullets(content.bullets ?? [])}
          {content.body ? renderBody("mt-2 text-xs", content.body) : null}
        </div>
      );
    }

    case "quote":
      return (
        <div className="flex h-full flex-col items-center justify-center text-center">
          {block(
            <blockquote
              className="text-xl font-medium italic"
              style={mutedStyle}
            >
              &ldquo;
              <RichTextContent
                html={content.quote ?? content.body ?? title}
              />
              &rdquo;
            </blockquote>,
            CONTENT_ANIM_DELAY.title
          )}
          {content.attribution
            ? block(
                <p className="mt-4 text-sm" style={mutedStyle}>
                  — {content.attribution}
                </p>,
                CONTENT_ANIM_DELAY.body
              )
            : null}
        </div>
      );

    default:
      return (
        <div className="flex h-full flex-col">
          {renderTitle("text-xl font-semibold")}
          {content.body ? renderBody("mt-4 text-sm", content.body) : null}
        </div>
      );
  }
}
