const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnvValue(key) {
  const envPath = path.join(__dirname, "..", ".env.local");
  const content = fs.readFileSync(envPath, "utf8");
  const line = content.split("\n").find((l) => l.startsWith(`${key}=`));
  if (!line) return null;
  return line.replace(`${key}=`, "").trim();
}

async function main() {
  const file = process.argv[2] ?? "002_storage_buckets.sql";
  const connectionString =
    loadEnvValue("DATABASE_POOLER_URL") ?? loadEnvValue("DATABASE_URL");
  if (!connectionString) {
    throw new Error("DATABASE_POOLER_URL or DATABASE_URL required in .env.local");
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected");

  const sql = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "migrations", file),
    "utf8"
  );

  await client.query(sql);
  console.log(`Applied ${file}`);
  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
