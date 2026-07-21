/**
 * Brand color helpers — contrast checks + derived slide support colors.
 */

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16),
  };
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0]! + 0.7152 * lin[1]! + 0.0722 * lin[2]!;
}

/** WCAG contrast ratio between two hex colors. */
export function contrastRatio(a: string, b: string): number | null {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return null;
  const l1 = relativeLuminance(ca.r, ca.g, ca.b);
  const l2 = relativeLuminance(cb.r, cb.g, cb.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const WHITE = "#ffffff";

/**
 * Org brand kit: primary must stay readable as slide text on white.
 * Accent may be a light decorative brand color — slides darken it for text.
 */
export function validateBrandKitContrast(
  primary: string,
  accent: string
): string | null {
  const primaryRatio = contrastRatio(primary, WHITE);
  const accentParsed = parseHex(accent);
  if (primaryRatio == null || !accentParsed) {
    return "Colors must be valid #RRGGBB hex values";
  }
  if (primaryRatio < 4.5) {
    return `Primary color contrast on white is ${primaryRatio.toFixed(2)}:1 (need ≥ 4.5:1)`;
  }
  return null;
}

/** True when accent would be hard to read as text on a white slide. */
export function accentNeedsReadableAdjust(accent: string, minRatio = 3): boolean {
  const ratio = contrastRatio(accent, WHITE);
  return ratio == null || ratio < minRatio;
}

/**
 * Darken (or lighten) a color until it meets min contrast on white.
 * Preserves hue so light brand accents become usable slide text colors.
 */
export function ensureContrastOnWhite(color: string, minRatio = 3): string {
  const ratio = contrastRatio(color, WHITE);
  if (ratio != null && ratio >= minRatio) return color;

  const parsed = parseHex(color);
  if (!parsed) return "#525252";

  let { r, g, b } = parsed;
  const targetL = relativeLuminance(r, g, b);
  // Light colors → darken toward black; already-dark failures → lighten toward black mid
  const towardBlack = targetL >= 0.5;

  for (let i = 0; i < 48; i++) {
    if (towardBlack) {
      r = mix(r, 0, 0.1);
      g = mix(g, 0, 0.1);
      b = mix(b, 0, 0.1);
    } else {
      r = mix(r, 0, 0.08);
      g = mix(g, 0, 0.08);
      b = mix(b, 0, 0.08);
    }
    const hex = toHex(r, g, b);
    const next = contrastRatio(hex, WHITE);
    if (next != null && next >= minRatio) return hex;
  }

  return "#525252";
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Derive muted text + border from brand primary (no fixed hex). */
export function deriveSlideSupportColors(primary: string): {
  muted: string;
  border: string;
} {
  const p = parseHex(primary);
  if (!p) {
    return { muted: "#737373", border: "#e5e5e5" };
  }
  const muted = toHex(
    mix(p.r, 115, 0.55),
    mix(p.g, 115, 0.55),
    mix(p.b, 115, 0.55)
  );
  const border = toHex(
    mix(p.r, 255, 0.88),
    mix(p.g, 255, 0.88),
    mix(p.b, 255, 0.88)
  );
  return { muted, border };
}
