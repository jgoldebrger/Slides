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

async function ok(client, sql) {
  const r = await client.query(sql);
  return Boolean(Object.values(r.rows[0] ?? {})[0]);
}

async function main() {
  const connectionString =
    loadEnvValue("DATABASE_POOLER_URL") ?? loadEnvValue("DATABASE_URL");
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const checks = [
    ["001 core tables", "select to_regclass('public.organizations') is not null and to_regclass('public.decks') is not null and to_regclass('public.slides') is not null"],
    ["008 org billing cols", "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='organizations' and column_name='stripe_customer_id')"],
    ["008 subscription_status", "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='organizations' and column_name='subscription_status')"],
    ["009 notify_export_ready", "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='notify_export_ready')"],
    ["010 rate_limit_counters", "select to_regclass('public.rate_limit_counters') is not null"],
    ["011 deck_share_links", "select to_regclass('public.deck_share_links') is not null"],
    ["011 deck_revisions", "select to_regclass('public.deck_revisions') is not null"],
    ["013 ai_generations.result", "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='ai_generations' and column_name='result')"],
    ["015 auth_rate_limit_counters", "select to_regclass('public.auth_rate_limit_counters') is not null"],
    ["015 bump_rate_limit()", "select exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='bump_rate_limit')"],
    ["015 bump_auth_rate_limit()", "select exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='bump_auth_rate_limit')"],
    ["016 stripe_webhook_events", "select to_regclass('public.stripe_webhook_events') is not null"],
    ["016 replace_deck_slides()", "select exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='replace_deck_slides')"],
    ["016 allocate_deck_revision()", "select exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='allocate_deck_revision')"],
    ["016 restore_deck_revision()", "select exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='restore_deck_revision')"],
    ["016 claim_deck_job()", "select exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='claim_deck_job')"],
    ["018 brand_kits.ai_tone", "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='brand_kits' and column_name='ai_tone')"],
    ["019 decks.metadata", "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='decks' and column_name='metadata')"],
    ["020 project_updates.metadata", "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='project_updates' and column_name='metadata')"],
    ["021 organizations.settings", "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='organizations' and column_name='settings')"],
    ["021 ai_activity", "select to_regclass('public.ai_activity') is not null"],
    ["021 ai_generations.confidence", "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='ai_generations' and column_name='confidence')"],
    ["021 ai_generations.citations", "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='ai_generations' and column_name='citations')"],
  ];

  const missing = [];
  console.log("Migration coverage:");
  for (const [label, sql] of checks) {
    const present = await ok(client, sql);
    console.log(`  ${present ? "OK" : "MISSING"}  ${label}`);
    if (!present) missing.push(label);
  }

  const buckets = await client.query(`select id from storage.buckets order by id`);
  console.log("\nStorage buckets:", buckets.rows.map((r) => r.id).join(", ") || "(none)");

  console.log("\nSummary:");
  if (!missing.length) {
    console.log("All probed migration artifacts are present.");
  } else {
    console.log(`Not fully applied — missing ${missing.length}:`);
    for (const m of missing) console.log(`  - ${m}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
