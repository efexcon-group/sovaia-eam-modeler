import { test, expect } from "./fixtures";

test.describe("Shell & Navigation", () => {
  test("App lädt, Shell + Sidebar-Routen sichtbar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Architecture Modeler")).toBeVisible();
    // Sidebar-Routen (ModelerShell.SIDEBAR_ROUTES)
    await expect(page.getByText("Navigator", { exact: true })).toBeVisible();
    await expect(page.getByText("Einstellungen", { exact: true })).toBeVisible();
    // Kein Crash-Overlay / leere Seite
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("Settings erreichbar, Lizenz-&-Update-Tab vorhanden", async ({ page }) => {
    await page.goto("/#/settings");
    await expect(page.getByRole("heading", { name: "Einstellungen" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Lizenz & Update" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Benutzer & Rechte" })).toBeVisible();
  });
});
