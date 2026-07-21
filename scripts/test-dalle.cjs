process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
const key = env.match(/OPENAI_API_KEY=(.+)/)?.[1]?.trim();
if (!key) {
  console.error("No OPENAI_API_KEY");
  process.exit(1);
}

async function main() {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: "Simple blue bar chart on white background, corporate presentation style",
      size: "1792x1024",
      n: 1,
    }),
  });
  const text = await res.text();
  console.log("status:", res.status);
  console.log(text.slice(0, 500));
}

main().catch((e) => console.error(e.message));
