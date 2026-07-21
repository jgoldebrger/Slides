import { test, expect } from "@playwright/test";
import { readSeed } from "../fixtures/seed";

const email = process.env.E2E_TEST_EMAIL;
const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("Version history", () => {
  test.beforeEach(() => {
    test.skip(!email, "Set E2E_TEST_EMAIL");
    test.skip(!hasServiceRole, "Set SUPABASE_SERVICE_ROLE_KEY for seed");
    test.skip(!readSeed()?.readyDeckId, "Seed did not create ready deck");
  });

  test("restore confirm dialog opens", async ({ page }) => {
    const seed = readSeed()!;
    await page.goto(`/decks/${seed.readyDeckId}/editor`);
    await page.getByRole("button", { name: /version history/i }).click();
    await page.getByRole("button", { name: /^restore$/i }).first().click();
    await expect(
      page.getByRole("heading", { name: /restore this version/i })
    ).toBeVisible();
    await page.getByRole("button", { name: /cancel/i }).click();
  });
});
