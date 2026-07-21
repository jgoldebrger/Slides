// Run Next.js and Inngest Dev Server together for local background jobs.
const { spawn } = require("child_process");
const path = require("path");

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const inngestUrl = `${appUrl.replace(/\/$/, "")}/api/inngest`;

const children = [];

function run(name, command, args, env = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
    cwd: path.join(__dirname, ".."),
  });
  child.on("exit", (code) => {
    console.log(`[dev-all] ${name} exited with code ${code ?? 0}`);
    children.forEach((c) => {
      if (!c.killed) c.kill();
    });
    process.exit(code ?? 0);
  });
  children.push(child);
  return child;
}

console.log(`[dev-all] Inngest will sync functions from ${inngestUrl}`);
console.log("[dev-all] Starting Next.js and Inngest Dev Server…");

run("next", "node", ["scripts/dev.cjs"], { INNGEST_DEV: "1" });
run("inngest", "npx", ["inngest-cli@latest", "dev", "-u", inngestUrl]);

process.on("SIGINT", () => {
  children.forEach((c) => c.kill("SIGINT"));
  process.exit(0);
});
