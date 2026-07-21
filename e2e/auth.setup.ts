import { test as setup, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { seedE2EWorkspace } from "./fixtures/seed";

const authDir = path.join(__dirname, ".auth");
const authFile = path.join(authDir, "user.json");
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

setup("authenticate and seed workspace", async ({ page }) => {
  fs.mkdirSync(authDir, { recursive: true });

  if (!email || !password) {
    fs.writeFileSync(
      authFile,
      JSON.stringify({ cookies: [], origins: [] }, null, 2)
    );
    return;
  }

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/(dashboard|decks)/, { timeout: 30_000 });
  await page.context().storageState({ path: authFile });

  try {
    const seeded = await seedE2EWorkspace();
    if (seeded) {
      fs.writeFileSync(
        path.join(authDir, "seed.json"),
        JSON.stringify(seeded, null, 2)
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[e2e seed] skipped: ${message}`);
  }
});
