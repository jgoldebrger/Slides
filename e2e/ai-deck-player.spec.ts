import { test, expect } from "@playwright/test";

test.describe("AI deck player", () => {
  test.beforeEach(() => {
    test.skip(!process.env.E2E_SHARE_TOKEN, "requires E2E_SHARE_TOKEN");
  });

  test("share page shows play control when feature enabled", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();

    await page.goto(`/view/${process.env.E2E_SHARE_TOKEN}`);
    await expect(page.getByTestId("ai-deck-player")).toBeVisible();
    await expect(page.getByRole("button", { name: /play/i })).toBeVisible();

    await context.close();
  });
});
