#!/usr/bin/env node
/**
 * Ensure tokens/*.json primitive values match src/styles/theme.css.
 * Catches drift between DTCG source and hand-mirrored CSS.
 * Usage: node scripts/validate_tokens_css_sync.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TOKENS_DIR = path.join(ROOT, "tokens");
const THEME = path.join(ROOT, "src", "styles", "theme.css");

function flatten(obj, prefix = "", out = {}) {
  if (!obj || typeof obj !== "object") return out;
  if ("$value" in obj) {
    out[prefix] = obj.$value;
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("$")) continue;
    const next = prefix ? `${prefix}.${k}` : k;
    flatten(v, next, out);
  }
  return out;
}

function resolveToken(key, all) {
  let value = all[key];
  const seen = new Set();
  while (typeof value === "string") {
    const m = value.match(/^\{([a-zA-Z0-9._-]+)\}$/);
    if (!m) break;
    if (seen.has(m[1])) break;
    seen.add(m[1]);
    value = all[m[1]];
  }
  return value;
}

function tokenPathToCssVar(tokenPath) {
  if (tokenPath.startsWith("dark.")) {
    return tokenPathToCssVar(tokenPath.slice(5));
  }
  if (tokenPath.startsWith("color.")) {
    const parts = tokenPath.split(".");
    return `--color-${parts[1]}-${parts[2]}`;
  }
  const parts = tokenPath.split(".");
  if (parts.length === 2) {
    return `--${parts[0]}-${parts[1]}`;
  }
  if (parts.length === 3) {
    return `--${parts[0]}-${parts[1]}-${parts[2]}`;
  }
  return `--${parts.join("-")}`;
}

function normalizeColor(value) {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/(\d+)\.(\d*?)0+(?=\s|\)|,)/g, (_, intPart, fracPart) => {
      if (!fracPart || /^0+$/.test(fracPart)) return intPart;
      return `${intPart}.${fracPart.replace(/0+$/, "")}`;
    })
    .replace(/(\d+)\.(?=\s|\)|,)/g, "$1")
    .trim()
    .toLowerCase();
}

function parseCssBlock(css, selectorPattern) {
  const re = new RegExp(
    `${selectorPattern}\\s*\\{([\\s\\S]*?)\\}\\s*(?=html\\.dark|\\[data-theme|$)`,
    "m"
  );
  const match = css.match(re);
  if (!match) return {};
  const vars = {};
  const declRe = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m;
  while ((m = declRe.exec(match[1]))) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

function resolveCssValue(value, vars) {
  const trimmed = value.trim();
  const varMatch = trimmed.match(/^var\((--[a-z0-9-]+)\)$/);
  if (varMatch) {
    const next = vars[varMatch[1]];
    if (!next) return null;
    return resolveCssValue(next, vars);
  }
  return normalizeColor(trimmed);
}

function loadTokens() {
  const files = fs
    .readdirSync(TOKENS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const all = {};
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(TOKENS_DIR, file), "utf8"));
    Object.assign(all, flatten(data));
  }
  return all;
}

function main() {
  const tokens = loadTokens();
  const css = fs.readFileSync(THEME, "utf8");
  const lightVars = parseCssBlock(css, ":root");
  const darkVars = parseCssBlock(css, "html\\.dark,\\s*\\[data-theme=\"dark\"\\]");

  let failed = 0;

  // Primitive colors from color.json
  for (const [key, raw] of Object.entries(tokens)) {
    if (!key.startsWith("color.")) continue;
    const cssVar = tokenPathToCssVar(key);
    if (!(cssVar in lightVars)) continue;
    const tokenValue = normalizeColor(resolveToken(key, tokens));
    const cssValue = resolveCssValue(lightVars[cssVar], lightVars);
    if (!cssValue || tokenValue !== cssValue) {
      console.error(
        `Token/CSS mismatch for ${cssVar}: JSON=${tokenValue} CSS=${cssValue ?? "unresolved"}`
      );
      failed += 1;
    }
  }

  // Light semantic roles (semantic.json)
  const lightSemanticPrefixes = [
    "action.",
    "text.",
    "surface.",
    "border.",
    "feedback.",
  ];
  for (const [key] of Object.entries(tokens)) {
    if (!lightSemanticPrefixes.some((p) => key.startsWith(p))) continue;
    const cssVar = tokenPathToCssVar(key);
    if (!(cssVar in lightVars)) continue;
    const tokenValue = normalizeColor(resolveToken(key, tokens));
    const cssValue = resolveCssValue(lightVars[cssVar], lightVars);
    if (!cssValue || tokenValue !== cssValue) {
      console.error(
        `Light semantic mismatch for ${cssVar}: JSON=${tokenValue} CSS=${cssValue ?? "unresolved"}`
      );
      failed += 1;
    }
  }

  // Dark semantic roles (theming.json → dark.*)
  for (const [key] of Object.entries(tokens)) {
    if (!key.startsWith("dark.")) continue;
    const cssVar = tokenPathToCssVar(key);
    if (!(cssVar in darkVars)) continue;
    const tokenValue = normalizeColor(resolveToken(key, tokens));
    const cssValue = resolveCssValue(darkVars[cssVar], { ...lightVars, ...darkVars });
    if (!cssValue || tokenValue !== cssValue) {
      console.error(
        `Dark semantic mismatch for ${cssVar}: JSON=${tokenValue} CSS=${cssValue ?? "unresolved"}`
      );
      failed += 1;
    }
  }

  // Radius + motion duration bridged into theme.css
  const dimensionChecks = [
    ["radius.sm", "--radius-sm"],
    ["radius.md", "--radius-md"],
    ["radius.lg", "--radius-lg"],
    ["radius.xl", "--radius-xl"],
    ["duration.fast", "--duration-fast"],
    ["duration.normal", "--duration-normal"],
    ["duration.slow", "--duration-slow"],
  ];

  for (const [tokenKey, cssVar] of dimensionChecks) {
    if (!(tokenKey in tokens) || !(cssVar in lightVars)) continue;
    const tokenValue = resolveToken(tokenKey, tokens);
    if (tokenValue !== lightVars[cssVar]) {
      console.error(
        `Dimension mismatch for ${cssVar}: JSON=${tokenValue} CSS=${lightVars[cssVar]}`
      );
      failed += 1;
    }
  }

  // Easing.standard → --ease-standard
  const easing = resolveToken("easing.standard", tokens);
  if (Array.isArray(easing) && easing.length === 4) {
    const expected = `cubic-bezier(${easing.join(", ")})`;
    if (lightVars["--ease-standard"] !== expected) {
      console.error(
        `Easing mismatch for --ease-standard: JSON=${expected} CSS=${lightVars["--ease-standard"]}`
      );
      failed += 1;
    }
  }

  if (failed) {
    console.error(`Failed: ${failed} token/CSS sync check(s)`);
    process.exit(1);
  }

  console.log("OK: tokens/*.json values match theme.css (:root + dark)");
}

main();
