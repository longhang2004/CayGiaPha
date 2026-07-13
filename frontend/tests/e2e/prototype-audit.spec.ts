import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
] as const;

const AUDIT_ROUTES = [
  { name: "home", href: "/prototype/home" },
  { name: "signin", href: "/prototype/signin" },
  { name: "signup", href: "/prototype/signup" },
  { name: "forgot-password", href: "/prototype/forgot-password" },
  { name: "tree-list-welcome", href: "/prototype/tree-list?welcome=open&trees=none" },
  { name: "tree-owner", href: "/prototype/tree?person=ego" },
  { name: "tree-contributor", href: "/prototype/tree?role=contributor&person=ego" },
  { name: "tree-linked", href: "/prototype/tree?role=linked&person=ego" },
  { name: "tree-reader", href: "/prototype/tree?role=reader&person=ego" },
  { name: "tree-empty", href: "/prototype/tree/empty" },
  { name: "claim", href: "/prototype/claim/example-person" },
  { name: "help", href: "/prototype/help" },
  { name: "settings", href: "/prototype/settings" },
  { name: "consent", href: "/prototype/consent" },
  { name: "legal-tos", href: "/prototype/legal/tos" },
  { name: "legal-privacy", href: "/prototype/legal/privacy" },
] as const;

test.describe("prototype UI audit", () => {
  for (const viewport of VIEWPORTS) {
    for (const route of AUDIT_ROUTES) {
      test(`${route.name} at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        const response = await page.goto(route.href);
        expect(response?.status()).toBe(200);
        await expect(page.locator("body")).toBeVisible();
        await page.evaluate(() => document.fonts.ready);

        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
          ),
        ).toBe(true);

        await page.screenshot({
          path: test.info().outputPath(`${viewport.name}-${route.name}.png`),
          fullPage: true,
          animations: "disabled",
        });
      });
    }
  }
});
