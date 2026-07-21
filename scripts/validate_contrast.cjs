#!/usr/bin/env node
/**
 * Contrast checks for theme semantic pairs (light + dark).
 * Usage: node scripts/validate_contrast.cjs
 */
const fs = require("fs");
const path = require("path");

const THEME = path.join(__dirname, "..", "src", "styles", "theme.css");

/** OKLCH L → approximate relative luminance (Y). */
function oklchToY(str) {
  const m = String(str).match(/oklch\(\s*([0-9.]+)/i);
  if (!m) return null;
  const L = Number(m[1]);
  return L * L * L;
}

function contrastY(y1, y2) {
  const lighter = Math.max(y1, y2);
  const darker = Math.min(y1, y2);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseThemeBlocks(css) {
  const light = {};
  const dark = {};
  let mode = "light";
  for (const line of css.split("\n")) {
    if (
      line.includes('[data-theme="dark"]') ||
      line.includes("html.dark")
    ) {
      mode = "dark";
    }
    const m = line.match(
      /--([a-z0-9-]+):\s*(oklch\([^)]+\)|var\(--[a-z0-9-]+\))/i
    );
    if (m) {
      (mode === "dark" ? dark : light)[m[1]] = m[2];
    }
  }
  return { light, dark };
}

function resolveToOklch(map, name, depth = 0) {
  if (depth > 12) return null;
  const raw = map[name];
  if (!raw) return null;
  if (raw.startsWith("oklch")) return raw;
  const ref = raw.match(/var\(--([a-z0-9-]+)\)/);
  if (ref) return resolveToOklch(map, ref[1], depth + 1);
  return null;
}

function checkPair(map, fgName, bgName, min, label) {
  const fg = resolveToOklch(map, fgName);
  const bg = resolveToOklch(map, bgName);
  if (!fg || !bg) {
    console.error(`  MISSING ${fgName} or ${bgName}`);
    return 1;
  }
  const yf = oklchToY(fg);
  const yb = oklchToY(bg);
  if (yf == null || yb == null) {
    console.error(`  BAD OKLCH ${fgName}/${bgName}`);
    return 1;
  }
  const ratio = contrastY(yf, yb);
  const ok = ratio >= min;
  console.log(
    `  ${ok ? "OK" : "FAIL"} ${label ?? `${fgName} on ${bgName}`}: ${ratio.toFixed(2)}:1 (need ≥ ${min})`
  );
  return ok ? 0 : 1;
}

function main() {
  const css = fs.readFileSync(THEME, "utf8");
  const { light, dark } = parseThemeBlocks(css);
  const darkMap = { ...light, ...dark };

  const pairs = [
    ["text-primary", "surface-page", 4.5],
    ["text-secondary", "surface-page", 4.5],
    ["text-on-action", "action-primary", 4.5],
    ["text-link", "surface-page", 4.5],
    ["border-strong", "surface-page", 3],
    ["action-primary", "surface-page", 3],
  ];

  let failed = 0;

  for (const [themeName, map] of [
    ["light", light],
    ["dark", darkMap],
  ]) {
    console.log(`\n=== ${themeName} ===`);
    for (const [fg, bg, min] of pairs) {
      failed += checkPair(map, fg, bg, min);
    }
  }

  console.log("\n=== primitives ===");
  failed += checkPair(
    light,
    "color-brand-500",
    "color-neutral-0",
    4.5,
    "brand.500 on white"
  );
  failed += checkPair(
    light,
    "color-brand-600",
    "color-neutral-0",
    3,
    "brand.600 on white"
  );

  if (failed) {
    console.error(`\nFailed: ${failed} contrast check(s)`);
    process.exit(1);
  }
  console.log("\nOK: contrast checks passed");
}

main();
