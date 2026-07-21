import { test, expect } from "@playwright/test";
import { readSeed } from "../fixtures/seed";
import { EditorPage, ExportPage } from "../pages";

const email = process.env.E2E_TEST_EMAIL;
const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("Editor and export (seeded, no live AI)", () => {
  test.beforeEach(() => {
    test.skip(!email, "Set E2E_TEST_EMAIL");
    test.skip(!hasServiceRole, "Set SUPABASE_SERVICE_ROLE_KEY for seed");
    test.skip(!readSeed()?.readyDeckId, "Seed did not create ready deck");
  });

  test("ready deck opens in editor with slides and status", async ({
    page,
  }) => {
    const seed = readSeed()!;
    const editor = new EditorPage(page);
    await editor.goto(seed.readyDeckId);

    await expect(editor.statusBadge()).toContainText(/ready/i);
    await expect(page.getByText(/status overview/i).first()).toBeVisible();
    await expect(page.getByText(/metrics/i).first()).toBeVisible();
  });

  test("chart slide shows metric values from seed", async ({ page }) => {
    const seed = readSeed()!;
    await page.goto(`/decks/${seed.readyDeckId}/editor`);
    await page.getByRole("button", { name: /metrics/i }).first().click();
    await expect(page.getByText(/adoption|nps/i).first()).toBeVisible();
  });

  test("export page shows start export for ready deck", async ({ page }) => {
    const seed = readSeed()!;
    const exportPage = new ExportPage(page);
    await exportPage.goto(seed.readyDeckId);
    await expect(exportPage.startButton()).toBeVisible();
    await expect(exportPage.startButton()).toBeEnabled();
  });

  test("version history lists a restore action", async ({ page }) => {
    const seed = readSeed()!;
    const editor = new EditorPage(page);
    await editor.goto(seed.readyDeckId);
    await editor.historyToggle().click();
    await expect(page.getByRole("button", { name: /restore/i })).toBeVisible();
  });
});
