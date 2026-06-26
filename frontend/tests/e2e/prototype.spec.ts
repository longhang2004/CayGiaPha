import { test, expect } from "@playwright/test";

/**
 * Prototype pages smoke tests.
 *
 * These tests verify that every prototype page renders without errors in dev
 * mode. They do NOT require login, OTP, or any backend — all data is mocked.
 *
 * Run: npx playwright test tests/e2e/prototype.spec.ts
 */
test.describe("Prototype Pages — smoke tests (no auth required)", () => {
  test("index page lists all prototype links", async ({ page }) => {
    await page.goto("/prototype");
    await expect(page.locator("h1")).toContainText("Prototype Pages");
    // At minimum the tree link should be visible
    await expect(page.locator('a[href="/prototype/tree"]')).toBeVisible();
  });

  test("home prototype — logged-out state renders sign-up and sign-in CTAs", async ({
    page,
  }) => {
    await page.goto("/prototype/home");
    await expect(page.locator("h1#home-title")).toContainText("Cây Gia Phả");
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible();
    await expect(page.locator('a[href="/signin"]').first()).toBeVisible();
  });

  test("home prototype — logged-in state toggle shows tree CTA", async ({
    page,
  }) => {
    await page.goto("/prototype/home");
    // Toggle to logged-in state
    await page.click('button:has-text("Đã đăng nhập")');
    await expect(page.locator('a[href="/tree"]').first()).toBeVisible();
  });

  test("signin prototype — renders form with identifier and password", async ({ page }) => {
    await page.goto("/prototype/signin");
    await expect(page.locator("h1")).toContainText("Đăng nhập");
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("signup prototype — step renders region, fields and checkboxes", async ({
    page,
  }) => {
    await page.goto("/prototype/signup");
    await expect(page.locator("h1")).toContainText("Đăng ký");
    await expect(page.locator('select#signup-region')).toBeVisible();
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    // Submit should be disabled until both checkboxes are checked
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('input[type="checkbox"]').last().check();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test("tree prototype — populated tree renders graph canvas and sidebar", async ({
    page,
  }) => {
    await page.goto("/prototype/tree");
    await expect(page.locator("h1")).toContainText("Sơ đồ gia phả");
    await expect(page.locator(".tree-graph__canvas")).toBeVisible();
    // Mock persons appear as nodes
    await expect(
      page.locator(".tree-graph__node-name").filter({ hasText: "Ông Tổ" }),
    ).toBeVisible();
    await expect(
      page.locator(".tree-graph__node-name").filter({ hasText: "Bà Tổ" }),
    ).toBeVisible();
  });

  test("tree prototype — selecting a node shows info panel", async ({
    page,
  }) => {
    await page.goto("/prototype/tree");
    await page.click('button:has-text("Ông Tổ")');
    // side panel title should show the selected person
    await expect(page.locator(".side-panel__title")).toContainText("Ông Tổ");
  });

  test("tree prototype — settings modal opens via ?panel=settings", async ({
    page,
  }) => {
    await page.goto("/prototype/tree?panel=settings");
    await expect(page.locator(".settings-modal")).toBeVisible();
    await expect(page.locator(".settings-modal h2")).toContainText("Cài đặt");
  });

  test("tree prototype — empty/onboarding state renders first-member form", async ({
    page,
  }) => {
    await page.goto("/prototype/tree/empty");
    await expect(page.locator("h1")).toContainText(
      "Bắt đầu cây gia phả của bạn",
    );
    await expect(page.locator('input[id="displayName"]')).toBeVisible();
  });

  test("help prototype — renders help guide", async ({ page }) => {
    await page.goto("/prototype/help");
    // HelpGuide renders a heading about the guide
    await expect(page.locator("h1, h2").first()).toBeVisible();
  });
});
