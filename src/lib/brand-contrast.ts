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
 * Org brand kit colors must remain readable on white slide backgrounds.
 * Primary ≥ 4.5:1 (text), accent ≥ 3:1 (UI chrome on slides).
 */
export function validateBrandKitContrast(
  primary: string,
  accent: string
): string | null {
  const primaryRatio = contrastRatio(primary, WHITE);
  const accentRatio = contrastRatio(accent, WHITE);
  if (primaryRatio == null || accentRatio == null) {
    return "Colors must be valid #RRGGBB hex values";
  }
  if (primaryRatio < 4.5) {
    return `Primary color contrast on white is ${primaryRatio.toFixed(2)}:1 (need ≥ 4.5:1)`;
  }
  if (accentRatio < 3) {
    return `Accent color contrast on white is ${accentRatio.toFixed(2)}:1 (need ≥ 3:1)`;
  }
  return null;
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
  // Muted: blend primary toward mid gray for secondary slide text
  const muted = toHex(
    mix(p.r, 115, 0.55),
    mix(p.g, 115, 0.55),
    mix(p.b, 115, 0.55)
  );
  // Border: lighten toward white for subtle slide rules
  const border = toHex(
    mix(p.r, 255, 0.88),
    mix(p.g, 255, 0.88),
    mix(p.b, 255, 0.88)
  );
  return { muted, border };
}
