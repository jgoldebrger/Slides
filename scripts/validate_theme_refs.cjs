#!/usr/bin/env node
/**
 * Ensure theme.css defines CSS vars referenced by components via Tailwind theme.
 * Usage: node scripts/validate_theme_refs.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const THEME = path.join(ROOT, "src", "styles", "theme.css");
const GLOBALS = path.join(ROOT, "src", "app", "globals.css");

const REQUIRED = [
  "--action-primary",
  "--action-primary-hover",
  "--action-destructive",
  "--text-primary",
  "--text-secondary",
  "--text-on-action",
  "--text-link",
  "--surface-page",
  "--surface-card",
  "--surface-raised",
  "--border-default",
  "--border-strong",
  "--feedback-success",
  "--feedback-warning",
  "--feedback-error",
  "--feedback-info",
  "--primary-hover",
  "--link",
  "--success",
  "--warning",
  "--error",
  "--info",
  "--raised",
  "--border-strong-token",
];

const TAILWIND_THEME_COLORS = [
  "--color-primary-hover",
  "--color-link",
  "--color-success",
  "--color-warning",
  "--color-error",
  "--color-info",
  "--color-raised",
  "--color-border-strong",
];

function main() {
  const theme = fs.readFileSync(THEME, "utf8");
  const globals = fs.readFileSync(GLOBALS, "utf8");
  let failed = 0;

  if (!globals.includes('theme.css')) {
    console.error("globals.css must import theme.css");
    failed += 1;
  }

  for (const name of REQUIRED) {
    if (!theme.includes(name)) {
      console.error(`Missing in theme.css: ${name}`);
      failed += 1;
    }
  }

  for (const name of TAILWIND_THEME_COLORS) {
    if (!globals.includes(name)) {
      console.error(`Missing in globals @theme: ${name}`);
      failed += 1;
    }
  }

  // Spot-check components don't use slate/teal raw palettes on landing
  const landing = fs.readFileSync(
    path.join(ROOT, "src", "app", "landing", "page.tsx"),
    "utf8"
  );
  if (/slate-|teal-|from-slate|to-teal/.test(landing)) {
    console.error("landing/page.tsx still uses slate/teal palette classes");
    failed += 1;
  }

  if (failed) {
    console.error(`Failed: ${failed} theme ref check(s)`);
    process.exit(1);
  }
  console.log("OK: theme refs resolve; landing uses semantic tokens");
}

main();
