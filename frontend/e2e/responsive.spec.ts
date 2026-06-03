import { test, expect } from "./fixtures";

const routes = ["/#/navigator", "/#/settings"];

test.describe("Responsiveness / Mobile-Gaps", () => {
  for (const route of routes) {
    test(`kein horizontaler Overflow: ${route}`, async ({ page }) => {
      await page.goto(route);
      await page.waitForTimeout(500);
      const { scrollW, clientW } = await page.evaluate(() => ({
        scrollW: document.documentElement.scrollWidth,
        clientW: document.documentElement.clientWidth,
      }));
      // Schlägt fehl, wenn die Seite breiter rendert als der Viewport
      // (klassischer Desktop-first-Mobile-Gap). Toleranz 1px.
      expect(scrollW, `Seite überläuft horizontal (${route})`).toBeLessThanOrEqual(clientW + 1);
    });
  }

  test("Navigation auf Mobile erreichbar", async ({ page }) => {
    await page.goto("/");
    const navVisible = await page
      .getByText("Navigator", { exact: true })
      .isVisible()
      .catch(() => false);
    const toggleCount = await page.getByRole("button", { name: /men[uü]|navigation/i }).count();
    // Entweder sichtbar (Desktop) oder via Toggle (Mobile-Pattern) — sonst Gap.
    expect(
      navVisible || toggleCount > 0,
      "Navigation weder sichtbar noch per Toggle erreichbar (Mobile-Gap)",
    ).toBeTruthy();
  });
});
