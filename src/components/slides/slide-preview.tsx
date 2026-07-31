import type { BrandPreviewTheme } from "@/lib/brand";
import { getPreviewFontClass } from "@/lib/brand";
import {
  resolveSlideColors,
} from "@/lib/slides/layout-theme";
import { assertLayoutContractsComplete } from "@/lib/slides/layout-contract";
import {
  compositionToPreviewStyles,
  ptToPx,
  resolveLayoutComposition,
  type LayoutComposition,
  type PreviewCompositionStyles,
} from "@/lib/slides/layout-spec";
import type { Slide } from "@/types/slide";
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
  bulletClass,
  bulletStyle,
  visibleBulletCount,
  staggerAnimation,
}: {
  items: string[];
  className?: string;
  mutedStyle: React.CSSProperties;
  bulletClass?: string;
  bulletStyle?: React.CSSProperties;
  visibleBulletCount?: number;
  staggerAnimation?: boolean;
}) {
  const visible =
    visibleBulletCount != null ? items.slice(0, visibleBulletCount) : items;
  if (!visible.length) return null;
  return (
    <ul
      className={cn(
        bulletClass ?? "list-disc space-y-2 pl-5 text-sm",
        staggerAnimation && visibleBulletCount == null && "slide-bullet-stagger",
        className
      )}
      style={{ ...mutedStyle, ...bulletStyle }}
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

function PreviewBrandedAccentBar({
  layoutStyles,
  color,
}: {
  layoutStyles: PreviewCompositionStyles;
  color: string;
}) {
  return (
    <div
      aria-hidden
      className="absolute"
      style={{
        top: layoutStyles.accentBarTopPx,
        left: layoutStyles.accentBarLeftPx,
        width: layoutStyles.accentBarWidthPx,
        height: layoutStyles.accentBarHeightPx,
        backgroundColor: color,
      }}
    />
  );
}

function PreviewZonedLayout({
  layoutStyles,
  showAccentBar,
  accentColor,
  title,
  children,
}: {
  layoutStyles: PreviewCompositionStyles;
  showAccentBar: boolean;
  accentColor: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-full w-full">
      {showAccentBar && (
        <PreviewBrandedAccentBar layoutStyles={layoutStyles} color={accentColor} />
      )}
      <div
        className="absolute overflow-hidden"
        style={{
          top: layoutStyles.titleTopPx,
          left: layoutStyles.paddingXPx,
          right: layoutStyles.paddingXPx,
          height: layoutStyles.titleHeightPx,
        }}
      >
        {title}
      </div>
      <div
        className={cn("absolute flex min-h-0 flex-col", layoutStyles.contentClass)}
        style={{
          top: layoutStyles.contentTopPx,
          left: layoutStyles.paddingXPx,
          right: layoutStyles.paddingXPx,
          height: layoutStyles.contentHeightPx,
          gap: layoutStyles.contentGapPx,
        }}
      >
        {children}
      </div>
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
    slide.content.backgroundImageUrl ?? deckBackgroundUrl ?? undefined;

  const useDefaultEnter = !playAnimations || animation.entrance === "none";
  const composition = resolveLayoutComposition(slide, { branded: applyBranding });
  const layoutStyles = compositionToPreviewStyles(composition);

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
          "relative z-10 h-full",
          backgroundUrl ? "bg-transparent" : "bg-white"
        )}
      >
      <div
        key={`${slide.id}-${animationRunId}`}
        className={cn("h-full", entranceClass)}
      >
      <SlideLayoutContent
        slide={slide}
        composition={composition}
        layoutStyles={layoutStyles}
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
  slide,
  composition,
  layoutStyles,
  colors,
  logoUrl,
  onImageClick,
  visibleBulletCount,
  staggerBullets = false,
  playAnimations = false,
  entrance = "none",
  animateContent = true,
}: {
  slide: Slide;
  composition: LayoutComposition;
  layoutStyles: PreviewCompositionStyles;
  colors: SlideColors;
  logoUrl?: string | null;
  onImageClick?: () => void;
  visibleBulletCount?: number;
  staggerBullets?: boolean;
  playAnimations?: boolean;
  entrance?: SlideEntranceAnimation;
  animateContent?: boolean;
}) {
  const { layout, title, content } = slide;
  const titleStyle = { color: colors.primary };
  const mutedStyle = { color: colors.muted };
  const metricValueStyle = {
    fontSize: `${ptToPx(composition.typography.metricValuePt)}px`,
    color: colors.accent,
  };
  const metricLabelStyle = {
    fontSize: `${ptToPx(composition.typography.metricLabelPt)}px`,
    color: colors.muted,
  };
  const gridGapStyle = { gap: layoutStyles.contentGapPx };
  const metricsGridClass =
    composition.metricsCols === 3 ? "grid-cols-3" : "grid-cols-2";
  const showAccentBar =
    composition.branded && layout !== "title" && layout !== "quote";

  const wrapZoned = (
    children: React.ReactNode,
    titleOverride?: React.ReactNode | null
  ) => (
    <PreviewZonedLayout
      layoutStyles={layoutStyles}
      showAccentBar={showAccentBar}
      accentColor={colors.primary}
      title={
        titleOverride === null ? null : titleOverride ?? renderTitle()
      }
    >
      {children}
    </PreviewZonedLayout>
  );

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

  const renderTitle = (extraClass?: string) =>
    block(
      <h2
        className={cn(layoutStyles.titleClass, extraClass)}
        style={{
          ...titleStyle,
          ...layoutStyles.titleStyle,
        }}
      >
        <RichTextContent html={title} />
      </h2>,
      CONTENT_ANIM_DELAY.title
    );

  const renderBody = (extraClass?: string, html?: string) =>
    html
      ? block(
          <p
            className={cn(layoutStyles.bodyClass, extraClass)}
            style={{ ...mutedStyle, ...layoutStyles.bodyStyle }}
          >
            <RichTextContent html={html} />
          </p>,
          CONTENT_ANIM_DELAY.body
        )
      : null;

  const renderBullets = (
    items: string[],
    options?: { className?: string; applyStep?: boolean }
  ) =>
    block(
      <PreviewBulletList
        items={items}
        mutedStyle={mutedStyle}
        bulletClass={layoutStyles.bulletClass}
        bulletStyle={layoutStyles.bulletStyle}
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
        <div className="relative h-full w-full">
          {composition.branded && (
            <PreviewBrandedAccentBar
              layoutStyles={layoutStyles}
              color={colors.primary}
            />
          )}
          <div
            className="flex h-full flex-col items-center justify-center text-center"
            style={{
              paddingLeft: layoutStyles.paddingXPx,
              paddingRight: layoutStyles.paddingXPx,
            }}
          >
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
            {renderTitle()}
            {content.body ? renderBody("mt-4", content.body) : null}
          </div>
        </div>
      );

    case "section_break":
      return wrapZoned(
        <div
          className="flex h-full items-center border-l-4 pl-6"
          style={{ borderColor: colors.primary }}
        >
          {renderTitle()}
        </div>,
        null
      );

    case "bullets": {
      const allBullets = content.bullets ?? [];
      const bullets =
        visibleBulletCount != null
          ? allBullets.slice(0, visibleBulletCount)
          : allBullets;
      if (content.imageUrl) {
        return wrapZoned(
          <div
            className="grid min-h-0 flex-1 grid-cols-2"
            style={gridGapStyle}
          >
            <div className="min-h-0">
              {renderBullets(bullets)}
              {content.body ? renderBody("mt-3", content.body) : null}
            </div>
            {renderImage(content.imageUrl, {
              imageAlt: content.imageAlt,
              maxHeight: "max-h-full",
              className: "h-full",
              wrapperClassName:
                "flex items-center justify-center rounded-lg bg-muted/30 p-2",
            })}
          </div>
        );
      }
      return wrapZoned(
        <>
          {renderBullets(bullets)}
          {content.body ? renderBody("mt-3", content.body) : null}
        </>
      );
    }

    case "metrics_grid": {
      const metrics = content.metrics ?? [];
      const fallbackBullets =
        metrics.length === 0 ? (content.bullets ?? []) : [];
      return wrapZoned(
        <>
          {metrics.length > 0 ? (
            <div
              className={cn("grid flex-1 min-h-0", metricsGridClass)}
              style={gridGapStyle}
            >
              {metrics.map((metric, i) =>
                block(
                  <div
                    key={i}
                    className="rounded-lg border p-4 text-center"
                    style={{ borderColor: colors.border }}
                  >
                    <p className="font-bold" style={metricValueStyle}>
                      {metric.value}
                    </p>
                    <p className="mt-1" style={metricLabelStyle}>
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
            ? renderBody(undefined, content.body)
            : null}
        </>
      );
    }

    case "timeline": {
      const timelineItems =
        visibleBulletCount != null
          ? (content.bullets ?? []).slice(0, visibleBulletCount)
          : (content.bullets ?? []);
      return wrapZoned(
        block(
          <div
            className={cn(staggerBullets && "slide-bullet-stagger")}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: layoutStyles.contentGapPx,
            }}
          >
              {timelineItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <p style={{ ...mutedStyle, ...layoutStyles.bulletStyle }}>
                    <RichTextContent html={item} />
                  </p>
                </div>
              ))}
            </div>,
            CONTENT_ANIM_DELAY.bullets
          )
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
        return wrapZoned(
          <div
            className="grid min-h-0 flex-1 grid-cols-2"
            style={gridGapStyle}
          >
            <div className="min-h-0">
              {renderBullets(left.length ? left : bullets)}
              {content.body ? renderBody("mt-3", content.body) : null}
            </div>
            <div className="flex flex-col" style={gridGapStyle}>
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
        );
      }

      return wrapZoned(
        <>
          <div className="grid flex-1 min-h-0 grid-cols-2" style={gridGapStyle}>
            {renderBullets(left, { applyStep: false })}
            {renderBullets(right, { applyStep: false })}
          </div>
          {content.body ? renderBody("mt-3", content.body) : null}
        </>
      );
    }

    case "image_caption":
      return wrapZoned(
        <div
          className="grid min-h-0 flex-1 grid-cols-2"
          style={gridGapStyle}
        >
          <div className="min-h-0">
            {renderBullets(content.bullets ?? [])}
            {content.body ? renderBody(undefined, content.body) : null}
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
      );

    case "chart": {
      const hasChart =
        Array.isArray(content.chartData) && content.chartData.length > 0;
      const hasMetrics =
        Array.isArray(content.metrics) && content.metrics.length > 0;
      return wrapZoned(
        <>
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
          {content.body ? renderBody("mt-2", content.body) : null}
        </>
      );
    }

    case "quote":
      return (
        <div className="relative h-full w-full">
          {composition.branded && (
            <PreviewBrandedAccentBar
              layoutStyles={layoutStyles}
              color={colors.primary}
            />
          )}
          <div
            className="flex h-full flex-col items-center justify-center text-center"
            style={{
              paddingLeft: layoutStyles.paddingXPx,
              paddingRight: layoutStyles.paddingXPx,
            }}
          >
          {block(
            <blockquote
              className="font-medium italic"
              style={{ ...mutedStyle, ...layoutStyles.titleStyle }}
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
                <p
                  className="mt-4"
                  style={{ ...mutedStyle, ...layoutStyles.bodyStyle }}
                >
                  — {content.attribution}
                </p>,
                CONTENT_ANIM_DELAY.body
              )
            : null}
          </div>
        </div>
      );

    default:
      return wrapZoned(
        content.body ? renderBody("mt-4", content.body) : null
      );
  }
}
