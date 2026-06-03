import { defineConfig, devices } from "@playwright/test";

/**
 * E2E/Visual/Responsive-Tests für den EAM-Modeler (Vite-SPA).
 *
 * Läuft gegen `vite preview` (CI) oder eine externe URL (E2E_BASE_URL).
 * Tests mocken /v1/me + /v1/edit/license (siehe e2e/fixtures.ts) — der Rest
 * der App rendert auch ohne Backend (Fehler werden im Code abgefangen), sodass
 * Shell/Routing/Settings deterministisch ohne Cluster testbar sind.
 *
 * Visual-Snapshots: erster Lauf legt Baselines an (`--update-snapshots`).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // Lokal/CI: gebautes Frontend per vite preview servieren (außer externe URL gesetzt).
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm preview --port 4173 --strictPort",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile-pixel", use: { ...devices["Pixel 5"] } },
    { name: "mobile-iphone", use: { ...devices["iPhone 13"] } },
  ],
});
