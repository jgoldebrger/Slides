import { test, expect } from "@playwright/test";
import { readSeed } from "../fixtures/seed";
import { EditorPage, ShareViewPage } from "../pages";

const email = process.env.E2E_TEST_EMAIL;
const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("Share links", () => {
  test.beforeEach(() => {
    test.skip(!email, "Set E2E_TEST_EMAIL");
    test.skip(!hasServiceRole, "Set SUPABASE_SERVICE_ROLE_KEY for seed");
    test.skip(!readSeed()?.shareViewPath, "Seed did not create share link");
  });

  test("public share view loads seeded deck without login", async ({
    browser,
  }) => {
    const seed = readSeed()!;
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    const share = new ShareViewPage(page);
    await share.goto(seed.shareViewPath);
    await expect(share.deckTitle("E2E Ready Deck")).toBeVisible();
    await expect(page.getByText(/view-only link|shared presentation/i)).toBeVisible();
    await context.close();
  });

  test("share panel can create a labeled link", async ({ page }) => {
    const seed = readSeed()!;
    const editor = new EditorPage(page);
    await editor.goto(seed.readyDeckId);
    await editor.shareToggle().click();
    await page.getByLabel(/label \(optional\)/i).fill("Playwright link");
    await page.getByRole("button", { name: /create share link/i }).click();
    await expect(page.getByText(/copy now/i)).toBeVisible({ timeout: 15_000 });
  });
});
