import { test, expect } from "./fixtures";

test.describe("Settings-Tabs (BLM-Layout, ADR-091)", () => {
  test("Tab-Wechsel Lizenz & Update zeigt Lizenzstatus", async ({ page }) => {
    await page.goto("/#/settings?tab=lizenz");
    await expect(page.getByRole("heading", { name: /Lizenz & Software-Update/ })).toBeVisible();
    // Eindeutige Section-Titel aus TabLizenzUpdate (synchron, datenunabhängig).
    await expect(page.getByText("Lizenzstatus", { exact: true })).toBeVisible();
  });

  test("Benutzer-&-Rechte-Tab verweist auf user-core", async ({ page }) => {
    await page.goto("/#/settings?tab=benutzer-und-rechte");
    await expect(page.getByText(/user-core/)).toBeVisible();
  });
});
