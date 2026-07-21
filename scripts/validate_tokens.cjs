#!/usr/bin/env node
/**
 * Validate DTCG tokens/*.json — JSON parse + alias resolution.
 * Usage: node scripts/validate_tokens.cjs
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TOKENS_DIR = path.join(ROOT, "tokens");

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

function collectAliases(value, found = []) {
  if (typeof value === "string") {
    const re = /\{([a-zA-Z0-9._-]+)\}/g;
    let m;
    while ((m = re.exec(value))) found.push(m[1]);
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectAliases(v, found));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((v) => collectAliases(v, found));
  }
  return found;
}

function main() {
  const files = fs
    .readdirSync(TOKENS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  if (!files.length) {
    console.error("No tokens/*.json found");
    process.exit(1);
  }

  const all = {};
  for (const file of files) {
    const raw = fs.readFileSync(path.join(TOKENS_DIR, file), "utf8");
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error(`Invalid JSON: ${file}: ${e.message}`);
      process.exit(1);
    }
    Object.assign(all, flatten(data));
  }

  const keys = new Set(Object.keys(all));
  let unresolved = 0;
  for (const [key, value] of Object.entries(all)) {
    for (const alias of collectAliases(value)) {
      if (!keys.has(alias) && !keys.has(alias.replace(/^dark\./, ""))) {
        // dark.* aliases point at color.* which exist
        const withoutDark = alias.startsWith("dark.")
          ? null
          : alias;
        if (withoutDark && !keys.has(withoutDark)) {
          // theming.json nests under "dark" so flat keys are dark.action.primary
          // aliases inside still reference color.brand.* etc.
        }
      }
      if (!keys.has(alias)) {
        // Allow references to color.*, font.*, duration.*, easing.* across files
        const exists = [...keys].some(
          (k) => k === alias || k.endsWith(`.${alias}`) || alias.endsWith(k)
        );
        if (!exists) {
          console.error(`Unresolved alias {${alias}} in ${key}`);
          unresolved += 1;
        }
      }
    }
  }

  // Stricter: every {path} must match a flattened key exactly
  unresolved = 0;
  for (const [key, value] of Object.entries(all)) {
    for (const alias of collectAliases(value)) {
      if (!keys.has(alias)) {
        console.error(`Unresolved alias {${alias}} referenced by ${key}`);
        unresolved += 1;
      }
    }
  }

  if (unresolved) {
    console.error(`Failed: ${unresolved} unresolved alias(es)`);
    process.exit(1);
  }

  console.log(`OK: ${files.length} token files, ${keys.size} tokens, aliases resolve`);
}

main();
