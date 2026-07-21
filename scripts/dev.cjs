// Dev helper: corporate SSL proxies often break Node TLS to Supabase.
// Use only for local development — never in production.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const { spawn } = require("child_process");
const path = require("path");

const nextBin = path.join(
  __dirname,
  "..",
  "node_modules",
  "next",
  "dist",
  "bin",
  "next"
);

const next = spawn(process.execPath, [nextBin, "dev"], {
  stdio: "inherit",
  env: process.env,
});

next.on("exit", (code) => process.exit(code ?? 0));
