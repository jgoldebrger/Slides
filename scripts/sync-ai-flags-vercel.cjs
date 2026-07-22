const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const PROJECT = "slides";
const ENV_TARGETS = "production,preview,development";

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function featureEnvKeys() {
  const content = read("src/lib/ai/feature-flags.ts");
  const block = content.match(/export const AI_FEATURE_IDS = \[([\s\S]*?)\] as const/);
  if (!block) throw new Error("Could not parse AI_FEATURE_IDS");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => `AI_FEATURE_${m[1].toUpperCase()}`);
}

function addonEnvKeys() {
  const content = read("src/lib/ai/addons/catalog.ts");
  const keys = [];
  for (const line of content.split("\n")) {
    const m = line.match(/addon\(\d+, "[A-O]", "[^"]+", "[^"]+"\)/);
    if (!m) continue;
    const num = line.match(/addon\((\d+)/)?.[1];
    const cluster = line.match(/addon\(\d+, "([A-O])"/)?.[1];
    const slug = line.match(/addon\(\d+, "[A-O]", "([^"]+)"/)?.[1];
    if (!num || !cluster || !slug) continue;
    const id = `addon_${cluster.toLowerCase()}_${String(num).padStart(2, "0")}_${slug}`;
    keys.push(`AI_ADDON_${id.toUpperCase()}`);
  }
  return keys;
}

function upsertEnv(name) {
  const cmd = [
    "npx",
    "vercel",
    "env",
    "add",
    name,
    ENV_TARGETS,
    "--project",
    PROJECT,
    "--value",
    "1",
    "--no-sensitive",
    "--force",
    "--yes",
  ].join(" ");

  try {
    execSync(cmd, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
    });
    return "added";
  } catch (err) {
    const msg = `${err.stdout ?? ""}${err.stderr ?? ""}${err.message}`;
    if (/already exists|Updated/i.test(msg)) return "ok";
    throw new Error(`${name}: ${msg}`);
  }
}

function main() {
  const keys = [...featureEnvKeys(), ...addonEnvKeys()];
  console.log(`Syncing ${keys.length} AI flag env vars to Vercel (${PROJECT})…`);

  let done = 0;
  let failed = 0;
  for (const key of keys) {
    try {
      upsertEnv(key);
      done += 1;
      if (done % 25 === 0) console.log(`  …${done}/${keys.length}`);
    } catch (err) {
      failed += 1;
      console.error(`  FAIL ${key}: ${err.message}`);
    }
  }

  console.log(`\nDone: ${done} synced, ${failed} failed, ${keys.length} total.`);
  if (failed) process.exit(1);
}

main();
