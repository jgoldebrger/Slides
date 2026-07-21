import { test, expect } from "@playwright/test";
import { readSeed } from "../fixtures/seed";

const email = process.env.E2E_TEST_EMAIL;
const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("Project updates", () => {
  test.beforeEach(() => {
    test.skip(!email, "Set E2E_TEST_EMAIL");
    test.skip(!hasServiceRole, "Set SUPABASE_SERVICE_ROLE_KEY for seed");
    test.skip(!readSeed()?.projectId, "Seed did not create project");
  });

  test("updates form tabs are keyboard-accessible", async ({ page }) => {
    const seed = readSeed()!;
    await page.goto(`/projects/${seed.projectId}/updates`);
    await expect(page.getByRole("tab", { name: /goals/i })).toBeVisible();
    await page.getByRole("tab", { name: /metrics/i }).click();
    await expect(page.getByRole("tabpanel")).toBeVisible();
    await expect(page.getByText(/chart number|display value/i).first()).toBeVisible();
  });
});
