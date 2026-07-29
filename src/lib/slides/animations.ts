export const SLIDE_ENTRANCE_ANIMATIONS = [
  "none",
  "fade",
  "slide-up",
  "slide-right",
  "zoom",
] as const;

export type SlideEntranceAnimation = (typeof SLIDE_ENTRANCE_ANIMATIONS)[number];

export type SlideAnimationSettings = {
  entrance: SlideEntranceAnimation;
  /** Animate title, body, bullets, and images separately. */
  animateContent: boolean;
  staggerBullets: boolean;
};

export const SLIDE_ANIMATION_LABELS: Record<SlideEntranceAnimation, string> = {
  none: "None",
  fade: "Fade in",
  "slide-up": "Slide up",
  "slide-right": "Slide from right",
  zoom: "Zoom in",
};

export const DEFAULT_SLIDE_ANIMATION: SlideAnimationSettings = {
  entrance: "fade",
  animateContent: true,
  staggerBullets: false,
};

export function normalizeSlideAnimationSettings(
  partial?: Partial<SlideAnimationSettings> | null
): SlideAnimationSettings {
  const entrance = SLIDE_ENTRANCE_ANIMATIONS.includes(
    partial?.entrance as SlideEntranceAnimation
  )
    ? (partial!.entrance as SlideEntranceAnimation)
    : DEFAULT_SLIDE_ANIMATION.entrance;

  return {
    entrance,
    animateContent: partial?.animateContent !== false,
    staggerBullets: partial?.staggerBullets === true,
  };
}

export function parseSlideAnimation(
  metadata?: Record<string, unknown> | null
): SlideAnimationSettings {
  const raw = metadata?.animation;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SLIDE_ANIMATION };

  return normalizeSlideAnimationSettings(raw as Partial<SlideAnimationSettings>);
}

export function slideAnimationClass(
  entrance: SlideEntranceAnimation
): string | undefined {
  switch (entrance) {
    case "fade":
      return "slide-anim-fade";
    case "slide-up":
      return "slide-anim-up";
    case "slide-right":
      return "slide-anim-right";
    case "zoom":
      return "slide-anim-zoom";
    default:
      return undefined;
  }
}

export function buildSlideAnimationMetadata(
  current: Record<string, unknown> | undefined,
  settings: SlideAnimationSettings
): Record<string, unknown> {
  return {
    ...(current ?? {}),
    animation: settings,
  };
}
