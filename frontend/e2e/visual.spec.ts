import { test, expect } from "./fixtures";

/**
 * Visual-Regression. Erster Lauf je Projekt/Viewport legt die Baseline an
 * (`pnpm e2e --update-snapshots`). Danach erkennen die Tests visuelle Drifts.
 */
test.describe("Visual Snapshots", () => {
  test("Navigator-Shell", async ({ page }, testInfo) => {
    await page.goto("/#/navigator");
    await page.waitForTimeout(800);
    await expect(page).toHaveScreenshot(`navigator-${testInfo.project.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test("Settings — Lizenz & Update", async ({ page }, testInfo) => {
    await page.goto("/#/settings?tab=lizenz");
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot(`settings-lizenz-${testInfo.project.name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });
});
