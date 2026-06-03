import { test as base, type Page } from "@playwright/test";

/** Mockt die fürs Shell-Rendering nötigen /v1-Calls (kein Backend/Login nötig). */
export async function mockApi(page: Page) {
  const openLicense = {
    version: "0.1.0",
    mode: "open",
    "allowed-layers": [],
    "allowed-paths": [],
  };
  await page.route("**/v1/me", (r) =>
    r.fulfill({ json: { tenant: "sovaia-internal", license: openLicense } }),
  );
  await page.route("**/v1/edit/license", (r) => r.fulfill({ json: openLicense }));
  await page.route("**/v1/health", (r) => r.fulfill({ json: { status: "ok" } }));
  // Reference/Navigator: leere, aber wohlgeformte Antworten → Seiten hängen nicht.
  await page.route("**/v1/reference/sovaia", (r) => r.fulfill({ json: { nodes: [], edges: [] } }));
  await page.route("**/v1/navigator/sovaia-status", (r) => r.fulfill({ json: {} }));
}

/** test-Fixture mit automatisch gemocktem API. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await mockApi(page);
    await use(page);
  },
});

export { expect } from "@playwright/test";
