const fs = require("fs");
const { Client } = require("pg");

const env = fs.readFileSync(".env.local", "utf8");
const url = (
  env.match(/DATABASE_POOLER_URL=(.+)/) || env.match(/DATABASE_URL=(.+)/)
)[1].trim();

const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

c.connect()
  .then(() =>
    c.query(
      `select id, status, error, model, created_at
       from ai_generations
       order by created_at desc
       limit 5`
    )
  )
  .then((r) => {
    console.log(JSON.stringify(r.rows, null, 2));
    return c.end();
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
