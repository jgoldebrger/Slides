import { test, expect } from "@playwright/test";
import { readSeed } from "../fixtures/seed";
import { EditorPage } from "../pages";

const email = process.env.E2E_TEST_EMAIL;
const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("Generation failure UX", () => {
  test.beforeEach(() => {
    test.skip(!email, "Set E2E_TEST_EMAIL");
    test.skip(!hasServiceRole, "Set SUPABASE_SERVICE_ROLE_KEY for seed");
    test.skip(!readSeed()?.failedDeckId, "Seed did not create failed deck");
  });

  test("failed deck shows alert banner with outline CTA", async ({ page }) => {
    const seed = readSeed()!;
    const editor = new EditorPage(page);
    await editor.goto(seed.failedDeckId);

    await expect(editor.failedBanner()).toBeVisible();
    await expect(editor.statusBadge()).toContainText(/failed/i);
    await expect(
      page.getByRole("link", { name: /back to outline/i })
    ).toBeVisible();
  });
});
