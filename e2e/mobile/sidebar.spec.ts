import { test, expect } from "@playwright/test";

const email = process.env.E2E_TEST_EMAIL;

test.describe("Mobile navigation", () => {
  test.beforeEach(() => {
    test.skip(!email, "Set E2E_TEST_EMAIL");
  });

  test("opens drawer and navigates to decks", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByTestId("mobile-nav-open").click();
    await expect(page.getByRole("navigation", { name: /main/i })).toBeVisible();
    await page
      .getByRole("navigation", { name: /main/i })
      .getByRole("link", { name: /^decks$/i })
      .click();
    await expect(page).toHaveURL(/\/decks/);
  });
});
