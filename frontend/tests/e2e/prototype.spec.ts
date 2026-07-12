import { test, expect } from "@playwright/test";

const PROTOTYPE_PAGES = [
  { href: "/prototype/home", label: "Trang chủ" },
  { href: "/prototype/signin", label: "Đăng nhập" },
  { href: "/prototype/signup", label: "Đăng ký" },
  { href: "/prototype/forgot-password", label: "Quên mật khẩu" },
  { href: "/prototype/tree-list", label: "Danh sách cây" },
  { href: "/prototype/tree", label: "Cây gia phả" },
  { href: "/prototype/tree?panel=settings", label: "Cây gia phả - Cài đặt" },
  { href: "/prototype/tree/empty", label: "Cây gia phả rỗng" },
  { href: "/prototype/invitation/test-invite-123", label: "Thư mời" },
  { href: "/prototype/help", label: "Hướng dẫn" },
];

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

  for (const p of PROTOTYPE_PAGES) {
    test(`manifest route renders without error: ${p.href}`, async ({ page }) => {
      const response = await page.goto(p.href);
      expect(response?.status()).toBe(200);
      await expect(page.locator("body")).toBeVisible();
    });
  }

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
    await expect(page.locator('input[name="displayName"]')).toHaveAttribute("autocomplete", "name");
    await expect(page.getByText("Tên này sẽ được dùng để người thân nhận ra bạn khi cộng tác.")).toBeVisible();
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
    await expect(page.locator("h1")).toContainText("Cây Gia Phả Mẫu");
    await expect(page.locator(".tree-graph__canvas")).toBeVisible();
    // Mock persons appear as nodes
    await expect(
      page.locator(".tree-graph__node-name").filter({ hasText: "Hàng Hữu Thiền" }),
    ).toBeVisible();
    await expect(
      page.locator(".tree-graph__node-name").filter({ hasText: "Lê Thị My" }),
    ).toBeVisible();
  });

  test("guidance prototypes remain usable at mobile 200% text and reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/prototype/tree-list?trees=none");
    await page.evaluate(() => document.documentElement.style.fontSize = "200%");
    await expect(page.getByRole("heading", { name: "Bắt đầu từng bước" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    await expect(page.getByRole("button", { name: "Thu gọn" })).toBeVisible();
  });

  test("guidance prototype states are deterministic", async ({ page }) => {
    await page.goto("/prototype/tree-list?state=collapsed");
    await expect(page.getByText(/Bước tiếp theo/)).toBeVisible();
    await page.goto("/prototype/tree-list?state=deferred");
    await expect(page.getByRole("heading", { name: "Bắt đầu từng bước" })).toHaveCount(0);
    await page.goto("/prototype/tree-list?state=completed");
    await expect(page.getByRole("heading", { name: "Bắt đầu từng bước" })).toHaveCount(0);
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ]) {
    for (const entry of ["chooser", "create", "join", "pending", "error"] as const) {
      test(`tree entry ${entry} stays usable on ${viewport.name}`, async ({ page }) => {
        const treeRequests: string[] = [];
        page.on("request", (request) => {
          if (request.url().includes("/api/v1/trees")) treeRequests.push(request.url());
        });
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`/prototype/tree-list?entry=${entry}&trees=none`);
        const modal = page.getByRole("dialog", { name: "Thêm cây gia phả" });
        await expect(modal).toBeVisible();
        if (entry === "chooser") {
          await expect(page.getByRole("button", { name: /Tạo cây mới/ })).toBeVisible();
          await expect(page.getByRole("button", { name: /Tham gia bằng mã mời/ })).toBeVisible();
        } else if (entry === "create") {
          await expect(page.getByLabel("Tên cây gia phả")).toBeVisible();
        } else if (entry === "join") {
          await expect(page.getByLabel("Mã mời 6 ký tự")).toBeVisible();
        } else if (entry === "pending") {
          await expect(page.getByRole("status")).toContainText("Đã gửi yêu cầu tham gia");
        } else {
          await expect(modal.getByRole("alert")).toContainText("Mã mời không đúng hoặc đã hết hạn");
        }
        const box = await modal.boundingBox();
        expect(box).toBeTruthy();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
        expect(treeRequests).toEqual([]);
      });
    }
  }

  test("tree entry modal restores focus and remains usable at mobile 200% text", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/prototype/tree-list?trees=none");
    const trigger = page.getByRole("button", { name: "+ Thêm cây" });
    await trigger.click();
    await page.evaluate(() => document.documentElement.style.fontSize = "200%");
    await expect(page.getByRole("button", { name: /Tạo cây mới/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Thêm cây gia phả" })).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ]) {
    test(`graph guidance stays inside safe area on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/prototype/tree");
      const layer = page.getByTestId("graph-overlay-layer");
      const card = page.locator(".guidance-card").first();
      await expect(layer).toBeVisible();
      await expect(card).toBeVisible();
      const [layerBox, cardBox, toolbarBox, navBox] = await Promise.all([
        layer.boundingBox(), card.boundingBox(), page.locator(".tree-page-header").boundingBox(), page.locator(".tree-graph__nav-controls").boundingBox(),
      ]);
      expect(layerBox && cardBox && toolbarBox && navBox).toBeTruthy();
      expect(cardBox!.x).toBeGreaterThanOrEqual(layerBox!.x - 1);
      expect(cardBox!.y).toBeGreaterThanOrEqual(layerBox!.y - 1);
      expect(cardBox!.x + cardBox!.width).toBeLessThanOrEqual(layerBox!.x + layerBox!.width + 1);
      expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(layerBox!.y + layerBox!.height + 1);
      expect(layerBox!.y + layerBox!.height).toBeLessThanOrEqual(toolbarBox!.y + 1);
      expect(layerBox!.x + layerBox!.width).toBeLessThanOrEqual(navBox!.x + 1);
    });
  }

  for (const viewport of [
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ]) {
    test(`transparent guidance wrapper remains click-through on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/prototype/tree");
      const wrapper = page.locator(".guidance-orchestrator__checklist");
      const card = wrapper.locator(".guidance-card");
      await expect(wrapper).toBeVisible();
      await expect(card).toBeVisible();
      expect(await wrapper.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
      expect(await card.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("auto");
    });
  }

  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ]) {
    test(`empty-tree progress stays inside its guidance container on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/prototype/tree/empty");
      const note = page.locator(".context-note");
      const progress = page.getByLabel("Các bước gợi ý");
      await expect(note).toBeVisible();
      await expect(progress).toBeVisible();
      await expect(progress).toContainText("1. Nhập tên");
      await expect(progress).toContainText("2. Chọn giới tính");
      await expect(progress).toContainText("3. Bấm lưu");
      expect(await progress.evaluate((element) => element.closest(".context-note") !== null)).toBe(true);
      const [noteBox, progressBox] = await Promise.all([note.boundingBox(), progress.boundingBox()]);
      expect(noteBox && progressBox).toBeTruthy();
      expect(progressBox!.x).toBeGreaterThanOrEqual(noteBox!.x - 1);
      expect(progressBox!.y).toBeGreaterThanOrEqual(noteBox!.y - 1);
      expect(progressBox!.x + progressBox!.width).toBeLessThanOrEqual(noteBox!.x + noteBox!.width + 1);
      expect(progressBox!.y + progressBox!.height).toBeLessThanOrEqual(noteBox!.y + noteBox!.height + 1);
      if (viewport.name === "mobile") {
        const stepBoxes = await Promise.all([
          progress.getByText("1. Nhập tên", { exact: true }).boundingBox(),
          progress.getByText("2. Chọn giới tính", { exact: true }).boundingBox(),
          progress.getByText("3. Bấm lưu", { exact: true }).boundingBox(),
        ]);
        expect(stepBoxes.every(Boolean)).toBe(true);
        expect(Math.max(...stepBoxes.map((box) => box!.y)) - Math.min(...stepBoxes.map((box) => box!.y))).toBeLessThan(4);
      }
    });
  }

  test("manual tour uses a safe fallback when its anchor is missing", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/prototype/tree?guide=tour-missing");
    const tour = page.locator(".guidance-tour");
    await expect(tour).toBeVisible();
    await expect(tour).toHaveAttribute("data-fallback", "true");
    await page.keyboard.press("Escape");
    await expect(tour).toHaveCount(0);
  });

  for (const viewport of [
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ]) {
    test(`manual tour stays inside safe area on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/prototype/tree?guide=tour");
      const layer = page.getByTestId("graph-overlay-layer");
      const tour = page.locator(".guidance-tour");
      await expect(tour).toBeVisible();
      const [layerBox, tourBox, toolbarBox] = await Promise.all([
        layer.boundingBox(), tour.boundingBox(), page.locator(".tree-page-header").boundingBox(),
      ]);
      expect(layerBox && tourBox && toolbarBox).toBeTruthy();
      expect(tourBox!.x).toBeGreaterThanOrEqual(layerBox!.x - 1);
      expect(tourBox!.y).toBeGreaterThanOrEqual(layerBox!.y - 1);
      expect(tourBox!.x + tourBox!.width).toBeLessThanOrEqual(layerBox!.x + layerBox!.width + 1);
      expect(tourBox!.y + tourBox!.height).toBeLessThanOrEqual(layerBox!.y + layerBox!.height + 1);
      expect(tourBox!.y + tourBox!.height).toBeLessThanOrEqual(toolbarBox!.y + 1);
    });
  }

  test("tree prototype — selecting a node shows info panel", async ({
    page,
  }) => {
    await page.goto("/prototype/tree");
    await page.click('button:has-text("Hàng Hữu Thiền")');
    // side panel name header should show the selected person
    await expect(page.locator(".person-info__header-name")).toContainText("Hàng Hữu Thiền");
  });

  test("tree prototype — settings modal opens via ?panel=settings", async ({
    page,
  }) => {
    await page.goto("/prototype/tree?panel=settings");
    await expect(page.locator(".settings-modal")).toBeVisible();
    await expect(page.locator(".settings-modal h2")).toContainText("Cài đặt");
    await expect(page.getByText("Hàng Nhựt Prototype")).toBeVisible();
    await expect(page.getByText("prototype@caygipha.dev")).toBeVisible();
  });

  test("tree prototype — collaboration roster shows owner and contributor identities without UUID labels", async ({ page }) => {
    await page.goto("/prototype/tree");
    await page.getByRole("button", { name: "Cộng tác" }).click();
    const roster = page.locator(".collaborator-roster");
    await expect(roster.getByText("Hàng Nhựt Prototype", { exact: true })).toBeVisible();
    await expect(roster.getByText("Nguyễn Văn A", { exact: true })).toBeVisible();
    await expect(roster.getByText("Chủ cây", { exact: true })).toBeVisible();
    await expect(roster.getByText("Cộng tác viên", { exact: true })).toBeVisible();
    await expect(page.getByText("prototype-user-id-0001")).toHaveCount(0);
  });

  test("invitation prototype — shows authenticated account name and identifier", async ({ page }) => {
    await page.goto("/prototype/invitation/test-invite-123");
    await expect(page.getByText("Hàng Nhựt Prototype")).toBeVisible();
    await expect(page.getByText("prototype@caygipha.dev")).toBeVisible();
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

  test("screenshot the family tree", async ({ page }) => {
    // Set viewport to 2560x1440 for high definition screenshot
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto("/prototype/tree");
    await page.waitForSelector(".tree-graph__canvas");

    // Wait for layout and animations to settle
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: "/Users/longhang/.gemini/antigravity/brain/0c47392a-b161-4f7a-957f-471aeb2f0e40/tree_screenshot.png",
    });
  });
});
