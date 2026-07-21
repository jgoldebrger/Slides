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
      `select id, layout, content->>'imagePath' as image_path
       from slides
       where id = '16ad7d58-7542-4e18-a3ef-c0bc8014fee3'`
    )
  )
  .then((r) => {
    console.log("slide:", JSON.stringify(r.rows, null, 2));
    return c.query(
      `select name, bucket_id from storage.objects where bucket_id = 'slide-assets' order by created_at desc limit 5`
    );
  })
  .then((r) => {
    console.log("objects:", JSON.stringify(r.rows, null, 2));
    return c.end();
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
