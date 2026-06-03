import { test, expect } from "./fixtures";

test.describe("Settings-Tabs (BLM-Layout, ADR-091)", () => {
  test("Tab-Wechsel Lizenz & Update zeigt Lizenzstatus", async ({ page }) => {
    await page.goto("/#/settings?tab=lizenz");
    await expect(page.getByRole("heading", { name: /Lizenz/ })).toBeVisible();
    // Modus-/Status-Zeile aus TabLizenzUpdate (open-License-Mock → "voller Zugriff")
    await expect(page.getByText(/Modus/)).toBeVisible();
    await expect(page.getByText(/Software-Update/)).toBeVisible();
  });

  test("Benutzer-&-Rechte-Tab verweist auf user-core", async ({ page }) => {
    await page.goto("/#/settings?tab=benutzer-und-rechte");
    await expect(page.getByText(/user-core/)).toBeVisible();
  });
});
