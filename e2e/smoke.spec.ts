import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages";

test.describe("UpdateDeck smoke", () => {
  test("landing page loads with brand-first hero", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      /UpdateDeck/
    );
    await expect(
      page.getByRole("navigation").getByRole("link", { name: /sign in/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /start free/i })
    ).toBeVisible();
  });

  test("login page loads with accessible fields", async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(login.email).toBeVisible();
    await expect(login.password).toBeVisible();
    await expect(login.submit).toBeVisible();
  });

  test("protected route redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("invalid share token shows unavailable page", async ({ page }) => {
    await page.goto("/view/not-a-real-share-token-xxxxxx");
    await expect(
      page.getByRole("heading", { name: /share link is unavailable/i })
    ).toBeVisible();
  });
});
