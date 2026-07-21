import { test, expect } from "@playwright/test";
import { readSeed } from "../fixtures/seed";
import { LoginPage } from "../pages";

const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

test.describe("Auth", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("signs in and lands in the app", async ({ page }) => {
    test.skip(!email || !password, "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD");

    const login = new LoginPage(page);
    await login.goto();
    await login.login(email!, password!);
    await expect(page).toHaveURL(/\/(dashboard|decks)/, { timeout: 30_000 });
    await expect(
      page.getByRole("link", { name: /UpdateDeck/i }).first()
    ).toBeVisible();
  });
});

test.describe("Seeded workspace", () => {
  test("seed artifact exists after setup", async () => {
    test.skip(!email || !password, "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD");
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
      "Set SUPABASE_SERVICE_ROLE_KEY to seed E2E data"
    );
    const seed = readSeed();
    expect(seed?.readyDeckId).toBeTruthy();
    expect(seed?.failedDeckId).toBeTruthy();
    expect(seed?.shareToken).toBeTruthy();
  });
});
