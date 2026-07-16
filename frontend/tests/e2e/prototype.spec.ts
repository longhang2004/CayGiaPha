import { test, expect, type Locator, type Page } from "@playwright/test";

// Keep this in sync with MOCK_PERSONS; a count change should force the picker contract to be reviewed.
const MOCK_PERSON_COUNT = 43;

const COMPLETED_WORKSPACE_GUIDANCE = {
  schemaVersion: 5,
  completed: [],
  dismissedTopicVersions: {},
  onboardingSkipped: false,
  workspaceCoach: {
    version: 2,
    chapters: {
      overview: "completed",
      actions: "completed",
      graph: "completed",
      person: "completed",
    },
  },
} as const;

async function installCompletedWorkspaceGuidance(page: Page) {
  await page.addInitScript((state) => {
    localStorage.setItem("cgp_guidance_v2", JSON.stringify(state));
  }, COMPLETED_WORKSPACE_GUIDANCE);
}

async function expectWithinViewport(locator: Locator) {
  await expect(locator).toBeVisible();
  await locator.evaluate(async (element) => {
    const animations = new Set<Animation>();
    let current: Element | null = element;
    while (current) {
      current.getAnimations().forEach((animation) => animations.add(animation));
      current = current.parentElement;
    }
    await Promise.all(Array.from(animations).map((animation) => animation.finished.catch(() => undefined)));
  });
  const geometry = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  });
  expect(
    geometry.top >= 0 &&
      geometry.left >= 0 &&
      geometry.bottom <= geometry.viewportHeight &&
      geometry.right <= geometry.viewportWidth,
    `Coach geometry must stay within the viewport: ${JSON.stringify(geometry)}`,
  ).toBe(true);
}

const PROTOTYPE_PAGES = [
  { href: "/prototype/home", label: "Trang chủ" },
  { href: "/prototype/signin", label: "Đăng nhập" },
  { href: "/prototype/signup", label: "Đăng ký" },
  { href: "/prototype/forgot-password", label: "Quên mật khẩu" },
  { href: "/prototype/tree-list", label: "Danh sách cây" },
  { href: "/prototype/tree-list?welcome=open", label: "Chào mừng truy cập sớm" },
  { href: "/prototype/tree", label: "Cây gia phả" },
  { href: "/prototype/tree?role=contributor&person=ego", label: "Cộng tác viên" },
  { href: "/prototype/tree?role=linked&person=ego", label: "Thành viên đã xác nhận" },
  { href: "/prototype/tree?role=reader&person=ego", label: "Người xem" },
  { href: "/prototype/tree?panel=settings", label: "Cây gia phả - Cài đặt" },
  { href: "/prototype/tree/empty", label: "Cây gia phả rỗng" },
  { href: "/prototype/invitation/test-invite-123", label: "Thư mời" },
  { href: "/prototype/claim/example-person", label: "Xác nhận đây là tôi" },
  { href: "/prototype/help", label: "Hướng dẫn" },
  { href: "/prototype/settings", label: "Quyền dữ liệu" },
  { href: "/prototype/consent", label: "Chấp thuận lại" },
  { href: "/prototype/legal/tos", label: "Điều khoản" },
  { href: "/prototype/legal/privacy", label: "Quyền riêng tư" },
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

  test("populated workspace exposes tabs, capability actions, search, and graph controls", async ({ page }) => {
    await installCompletedWorkspaceGuidance(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/prototype/tree");

    const listTab = page.getByRole("tab", { name: "Danh sách" });
    const graphTab = page.getByRole("tab", { name: "Sơ đồ" });
    await expect(listTab).toHaveAttribute("aria-selected", "true");
    await graphTab.click();
    await expect(graphTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-graph")).not.toHaveAttribute("inert", "");
    await page.getByRole("button", { name: "Điều khiển sơ đồ" }).click();
    for (const control of ["Phóng to", "Thu nhỏ", "Căn giữa người đang xem", "Đặt lại góc nhìn", "Toàn màn hình", "Tải SVG"]) {
      await expect(page.getByRole("button", { name: control })).toBeVisible();
    }
    await listTab.click();
    await expect(listTab).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#panel-graph")).toHaveAttribute("inert", "");

    await page.getByRole("button", { name: "Thêm người thân" }).click();
    await expect(page.getByRole("form", { name: "Thêm người thân" })).toBeVisible();
    await page.getByRole("button", { name: "Bỏ chọn" }).click();
    await page.getByRole("button", { name: "Bỏ chọn" }).click();
    await expect(page.locator(".tree-workspace__info-panel")).toBeHidden();

    const otherActions = page.getByRole("button", { name: "Thao tác khác" });
    await otherActions.click();
    await page.getByRole("button", { name: "Tìm người" }).click();
    const searchDialog = page.getByRole("dialog", { name: "Tìm người" });
    await expect(searchDialog.getByPlaceholder("Tìm tên hoặc cách xưng hô…")).toBeVisible();
    await searchDialog.getByRole("button", { name: "Đóng tìm người" }).click();
    await expect(otherActions).toBeFocused();

    await otherActions.click();
    await page.getByRole("button", { name: "Đổi góc nhìn" }).click();
    const viewpointDialog = page.getByRole("dialog", { name: "Chọn người làm góc nhìn" });
    await viewpointDialog.getByRole("button", { name: "Xem từ Nguyễn Thị Minh" }).click();
    await expect(page.locator(".tree-page-header")).toContainText("Nguyễn Thị Minh");
  });

  test("populated workspace reflows at 320px with 200 percent text", async ({ page }) => {
    await installCompletedWorkspaceGuidance(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/prototype/tree");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });

    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      footerRight: document.querySelector("footer")?.getBoundingClientRect().right,
    }));

    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.footerRight).toBeLessThanOrEqual(geometry.clientWidth);
    await expect(page.getByRole("button", { name: "Thêm người thân" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thao tác khác" })).toBeVisible();
  });

  test("workspace viewpoint picker covers every mock person and searches without diacritics", async ({ page }) => {
    await installCompletedWorkspaceGuidance(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/prototype/tree");

    await page.getByRole("button", { name: "Đổi người" }).click();
    const dialog = page.getByRole("dialog", { name: "Chọn người làm góc nhìn" });
    const choices = dialog.getByRole("button", { name: /^Xem từ / });
    await expect(dialog.getByRole("status")).toHaveText(`Tìm thấy ${MOCK_PERSON_COUNT} người.`);
    await expect(choices).toHaveCount(MOCK_PERSON_COUNT);

    await dialog.getByRole("searchbox", { name: "Tìm người làm góc nhìn" }).fill("nhut tien");
    await expect(dialog.getByRole("status")).toHaveText("Tìm thấy 1 người.");
    await expect(choices).toHaveCount(1);
    await dialog.getByRole("button", { name: "Xem từ Hàng Nhựt Tiến" }).click();

    await expect(page.locator(".tree-page-header")).toContainText("Hàng Nhựt Tiến");
  });

  for (const viewport of [
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1280, height: 800 },
  ]) {
    test(`populated workspace keeps compact header and full-width rows on ${viewport.name}`, async ({ page }) => {
      await installCompletedWorkspaceGuidance(page);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/prototype/tree");

      const headerBox = await page.locator(".tree-page-header").boundingBox();
      expect(headerBox).toBeTruthy();
      expect(headerBox!.height).toBeLessThanOrEqual(96);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        ),
      ).toBe(false);
      const relativeRow = page.getByRole("button", { name: /Chọn Hàng Hữu Phương/ });
      const groupBox = await page.getByRole("region", { name: "Người thân gần" }).boundingBox();
      const rowBox = await relativeRow.boundingBox();
      expect(rowBox).toBeTruthy();
      expect(groupBox).toBeTruthy();
      expect(rowBox!.width).toBeGreaterThanOrEqual(groupBox!.width - 2);
      await relativeRow.hover();
      await expect(relativeRow).toHaveCSS("border-radius", "0px");
    });
  }

  test("home prototype — logged-out state renders sign-up and sign-in CTAs", async ({
    page,
  }) => {
    await page.goto("/prototype/home");
    await expect(page.locator("h1#home-title")).toContainText("Cây Gia Phả");
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible();
    await expect(page.locator('a[href="/signin"]').first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Hướng dẫn sử dụng" })).toBeVisible();
  });

  test("home prototype — logged-in state toggle shows tree CTA", async ({
    page,
  }) => {
    await page.goto("/prototype/home");
    // Toggle to logged-in state
    await page.click('button:has-text("Đã đăng nhập")');
    await expect(page.locator('a[href="/tree"]').first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Hướng dẫn sử dụng" })).toBeVisible();
  });

  test("home prototype — help CTA opens the usage guide", async ({ page }) => {
    await page.goto("/prototype/home");
    await page.getByRole("link", { name: "Hướng dẫn sử dụng" }).click();
    await expect(page).toHaveURL(/\/help$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Hướng dẫn sử dụng" })).toBeVisible();
  });

  test("signin prototype — renders form with identifier and password", async ({ page }) => {
    await page.goto("/prototype/signin");
    await expect(page.locator("h1")).toContainText("Đăng nhập");
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("forgot-password prototype completes recovery without a live API request", async ({ page }) => {
    const authRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/auth/password-reset")) authRequests.push(request.url());
    });
    await page.goto("/prototype/forgot-password");
    await page.getByLabel("Số điện thoại hoặc email").fill("legacy@example.test");
    await page.getByRole("button", { name: "Gửi mã" }).click();
    await page.getByLabel("Mã xác nhận (6 chữ số)").fill("123456");
    await page.getByLabel("Mật khẩu mới (ít nhất 8 ký tự)").fill("MatKhauMoi123");
    await page.getByRole("button", { name: "Cập nhật mật khẩu" }).click();
    await expect(page.getByRole("status")).toContainText("Đã cập nhật mật khẩu");
    expect(authRequests).toEqual([]);
  });

  test("signup prototype — step renders region, fields and checkboxes", async ({
    page,
  }) => {
    await page.goto("/prototype/signup");
    await expect(page.locator("h1")).toContainText("Đăng ký");
    await expect(page.getByRole("button", { name: /Vùng miền \(cách xưng hô\)/i })).toBeVisible();
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="displayName"]')).toHaveAttribute("autocomplete", "name");
    await expect(page.getByText("Tên này sẽ được dùng để người thân nhận ra bạn khi cộng tác.")).toBeVisible();
    // Submit should be disabled until both checkboxes are checked
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    await page.getByRole("checkbox", { name: /Điều khoản dịch vụ/i }).press("Space");
    await page.getByRole("checkbox", { name: /Chính sách bảo mật/i }).press("Space");
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ]) {
    test(`invitation confirmation remains usable on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/prototype/invitation/test-invite-123");
      const card = page.locator(".invitation-page__card");
      await expect(card).toBeVisible();
      await expect(page.getByRole("button", { name: "Yêu cầu tham gia" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Huỷ bỏ" })).toBeVisible();
      const box = await card.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
    });
  }

  test("tree prototype — populated tree renders graph canvas and sidebar", async ({
    page,
  }) => {
    await page.goto("/prototype/tree");
    await expect(page.locator(".tree-page-header")).toHaveAttribute("title", "Cây Gia Phả Mẫu");
    await expect(page.locator(".tree-graph__canvas")).toBeVisible();
    // Mock persons appear as nodes
    await expect(
      page.locator(".tree-graph__node-name").filter({ hasText: "Hàng Hữu Thiền" }),
    ).toBeVisible();
    await expect(
      page.locator(".tree-graph__node-name").filter({ hasText: "Lê Thị My" }),
    ).toBeVisible();
  });

  test("tree prototype keeps the closed information panel out of the mobile workspace", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/prototype/tree");

    await expect(page.locator(".tree-workspace__info-panel")).toBeHidden();
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
    await page.goto("/prototype/tree-list?trees=none&state=collapsed");
    await expect(page.locator(".guidance-card--collapsed")).toBeVisible();
    await page.goto("/prototype/tree-list?trees=none&state=deferred");
    await expect(page.getByRole("heading", { name: "Bắt đầu từng bước" })).toHaveCount(0);
    await page.goto("/prototype/tree-list?trees=none&state=completed");
    await expect(page.getByRole("heading", { name: "Bắt đầu từng bước" })).toHaveCount(0);
  });

  test("welcome dialog supports links, Escape, and focus restoration", async ({ page }) => {
    await page.addInitScript(() => {
      const observer = new MutationObserver(() => {
        const trigger = [...document.querySelectorAll("button")].find(
          (button) => button.textContent?.trim() === "+ Thêm cây",
        );
        if (trigger instanceof HTMLButtonElement) {
          trigger.focus();
          observer.disconnect();
        }
      });
      observer.observe(document, { childList: true, subtree: true });
    });
    await page.goto("/prototype/tree-list?welcome=open&trees=none");

    const dialog = page.getByRole("dialog", {
      name: "Chào mừng bạn đến với phiên bản truy cập sớm của Cây Gia Phả!",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Feedback" })).toHaveAttribute(
      "href",
      "/feedback",
    );
    await expect(
      dialog.getByRole("link", { name: "một vài ly cà phê" }),
    ).toHaveAttribute("href", "/support");
    await expect(dialog.getByRole("button", { name: "Tôi đã hiểu" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Thêm cây" })).toBeFocused();
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ]) {
    test(`welcome dialog stays within the ${viewport.name} viewport`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/prototype/tree-list?welcome=open&trees=none");
      const dialog = page.getByRole("dialog", {
        name: "Chào mừng bạn đến với phiên bản truy cập sớm của Cây Gia Phả!",
      });
      await expect(dialog).toBeVisible();
      const box = await dialog.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        ),
      ).toBe(false);
    });
  }

  test("welcome dialog remains usable in dark mode at mobile 200% text", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/prototype/tree-list?welcome=open&trees=none");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });

    const dialog = page.getByRole("dialog", {
      name: "Chào mừng bạn đến với phiên bản truy cập sớm của Cây Gia Phả!",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Tôi đã hiểu" })).toBeVisible();
    const colors = await dialog.evaluate((element) => {
      const styles = getComputedStyle(element);
      return { background: styles.backgroundColor, foreground: styles.color };
    });
    expect(colors.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(colors.foreground).not.toBe(colors.background);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      ),
    ).toBe(false);
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
    test(`workspace Coach mark stays inside the usable area on ${viewport.name}`, async ({ page }) => {
      await page.addInitScript(() => localStorage.removeItem("cgp_guidance_v2"));
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/prototype/tree");
      const coach = page.locator(".workspace-coach");
      await expect(coach).toBeVisible();
      const [coachBox, headerBox, footerBox] = await Promise.all([
        coach.boundingBox(),
        page.locator(".tree-page-header").boundingBox(),
        page.locator(".tree-workspace-actions").boundingBox(),
      ]);
      expect(coachBox && headerBox && footerBox).toBeTruthy();
      expect(coachBox!.x).toBeGreaterThanOrEqual(0);
      expect(coachBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
      expect(coachBox!.x + coachBox!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(coachBox!.y + coachBox!.height).toBeLessThanOrEqual(footerBox!.y + 1);
    });
  }

  test("workspace Coach mark persists Escape and can be reopened from the action tray", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("cgp_guidance_v2"));
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/prototype/tree");
    const coach = page.locator(".workspace-coach");
    await expect(coach).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(coach).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("cgp_guidance_v2") ?? "{}").workspaceCoach?.chapters?.overview)).toBe("skipped");

    await page.getByRole("button", { name: "Thao tác khác" }).click();
    await page.getByRole("button", { name: "Mở hướng dẫn nhanh" }).click();
    await expect(coach).toBeVisible();
  });

  test("contextual Coach chapters wait for the user to open each workspace surface", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("cgp_guidance_v2", JSON.stringify({
        schemaVersion: 5,
        completed: [],
        dismissedTopicVersions: {},
        onboardingSkipped: false,
        workspaceCoach: { version: 2, chapters: { overview: "completed" } },
      }));
    });
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/prototype/tree");

    await expect(page.getByRole("dialog", { name: "Hướng dẫn nhanh" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Danh sách" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("dialog", { name: "Thao tác khác" })).toHaveCount(0);
    await expect(page.locator(".tree-workspace__info-panel--open")).toHaveCount(0);

    await page.getByRole("button", { name: "Thao tác khác" }).click();
    const actionDrawer = page.getByRole("dialog", { name: "Thao tác khác" });
    const actionCoach = actionDrawer.getByRole("dialog", { name: "Hướng dẫn nhanh" });
    await expect(actionCoach).toContainText("Tìm người và di chuyển trên sơ đồ");
    await expectWithinViewport(actionCoach);
    await expect(page.getByRole("tab", { name: "Danh sách" })).toHaveAttribute("aria-selected", "true");
    await actionCoach.getByRole("button", { name: "Bỏ qua" }).click();
    await actionDrawer.getByRole("button", { name: "Đóng thao tác khác" }).click();

    await page.getByRole("tab", { name: "Sơ đồ" }).click();
    await expect(page.getByRole("dialog", { name: "Hướng dẫn nhanh" })).toHaveCount(0);
    await page.getByRole("button", { name: "Điều khiển sơ đồ" }).click();
    const graphCoach = page.getByRole("dialog", { name: "Hướng dẫn nhanh" });
    await expect(graphCoach).toContainText("Tìm người và di chuyển trên sơ đồ");
    await expectWithinViewport(graphCoach);
    await expect(page.locator(".tree-workspace__info-panel--open")).toHaveCount(0);
    await graphCoach.getByRole("button", { name: "Bỏ qua" }).click();

    await page.getByRole("tab", { name: "Danh sách" }).click();
    await page.getByRole("button", { name: "Chọn Hàng Hữu Phương" }).click();
    const personPanel = page.locator(".tree-workspace__info-panel--open");
    const personCoach = personPanel.getByRole("dialog", { name: "Hướng dẫn nhanh" });
    await expect(personCoach).toContainText("Xem thông tin và cách xưng hô");
    await expectWithinViewport(personCoach);
    await expect(page.getByRole("dialog", { name: "Thao tác khác" })).toHaveCount(0);
    await personCoach.getByRole("button", { name: "Bỏ qua" }).click();

    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("cgp_guidance_v2") ?? "{}").workspaceCoach?.chapters)).toEqual({
      overview: "completed",
      actions: "skipped",
      graph: "skipped",
      person: "skipped",
    });
  });

  test("person Coach starts inside the mobile person sheet without replacing overview", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("cgp_guidance_v2"));
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/prototype/tree?person=ego");

    const panel = page.locator(".tree-workspace__info-panel--open");
    await expect(panel).toBeVisible();
    const personCoach = panel.getByRole("dialog", { name: "Hướng dẫn nhanh" });
    await expect(personCoach).toContainText("Xem thông tin và cách xưng hô");
    await personCoach.getByRole("button", { name: "Bỏ qua" }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("cgp_guidance_v2") ?? "{}").workspaceCoach?.chapters)).toEqual({
      person: "skipped",
    });

    await page.getByRole("button", { name: "Bỏ chọn" }).click();
    await expect(panel).toHaveCount(0);
    const overviewCoach = page.getByRole("dialog", { name: "Hướng dẫn nhanh" });
    await expect(overviewCoach).toBeVisible();
    for (let step = 0; step < 3; step += 1) {
      await overviewCoach.getByRole("button", { name: "Tiếp theo" }).click();
    }
    await expect(overviewCoach).toContainText("Xem thông tin và cách xưng hô");
    await expect(page.locator('[data-guidance-anchor="workspace-person-list"]')).toHaveAttribute(
      "data-guidance-highlight",
      "true",
    );
  });

  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ]) {
    test(`empty-tree progress stays inside its guidance container on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/prototype/tree/empty");
      const note = page.locator(".guidance-card");
      const progress = page.locator(".guidance-card");
      await expect(progress).toBeVisible();
      await expect(progress).toContainText("Bắt đầu từng bước");
      await expect(progress).toContainText("Thêm người đầu tiên");
      expect(await progress.evaluate((element) => element.closest(".guidance-card") !== null)).toBe(true);
      const [noteBox, progressBox] = await Promise.all([note.boundingBox(), progress.boundingBox()]);
      expect(noteBox && progressBox).toBeTruthy();
      expect(progressBox!.x).toBeGreaterThanOrEqual(noteBox!.x - 1);
      expect(progressBox!.y).toBeGreaterThanOrEqual(noteBox!.y - 1);
      expect(progressBox!.x + progressBox!.width).toBeLessThanOrEqual(noteBox!.x + noteBox!.width + 1);
      expect(progressBox!.y + progressBox!.height).toBeLessThanOrEqual(noteBox!.y + noteBox!.height + 1);
      if (viewport.name === "mobile") {
        const stepBoxes = await Promise.all([
          progress.getByText("Thêm người đầu tiên").boundingBox(),


        ]);
        expect(stepBoxes.every(Boolean)).toBe(true);
        expect(Math.max(...stepBoxes.map((box) => box!.y)) - Math.min(...stepBoxes.map((box) => box!.y))).toBeLessThan(4);
      }
    });
  }

  test("workspace Coach mark skips an unavailable explicit anchor", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/prototype/tree?guideState=tour-missing");
    const coach = page.locator(".workspace-coach");
    await expect(coach).toHaveCount(0);
    await page.waitForTimeout(120);
    await expect(coach).toHaveCount(0);
  });

  for (const viewport of [
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ]) {
    test(`explicit workspace Coach mark stays inside safe area on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/prototype/tree?guideState=tour");
      const coach = page.locator(".workspace-coach");
      await expect(coach).toBeVisible();
      const [coachBox, headerBox, footerBox] = await Promise.all([
        coach.boundingBox(),
        page.locator(".tree-page-header").boundingBox(),
        page.locator(".tree-workspace-actions").boundingBox(),
      ]);
      expect(coachBox && headerBox && footerBox).toBeTruthy();
      expect(coachBox!.x).toBeGreaterThanOrEqual(0);
      expect(coachBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
      expect(coachBox!.x + coachBox!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(coachBox!.y + coachBox!.height).toBeLessThanOrEqual(footerBox!.y + 1);
    });
  }

  test("tree prototype — selecting a node shows info panel", async ({
    page,
  }) => {
    await installCompletedWorkspaceGuidance(page);
    await page.goto("/prototype/tree");
    await page.getByRole("button", { name: "Chọn Hàng Hữu Thiền" }).click();
    // side panel name header should show the selected person
    await expect(page.locator(".person-info__header-name")).toContainText("Hàng Hữu Thiền");
  });

  test("tree prototype — actions follow Owner, Contributor, Linked, and Reader capabilities", async ({ page }) => {
    await page.goto("/prototype/tree?role=contributor&person=ego");
    await expect(page.getByRole("button", { name: "Thêm người thân" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Chỉnh sửa thông tin" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm quan hệ" })).toBeVisible();
    await page.getByRole("button", { name: "Thao tác khác" }).click();
    await expect(page.getByRole("button", { name: "Thêm thành viên khác" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cộng tác" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Cài đặt cây" })).toHaveCount(0);

    await page.goto("/prototype/tree?role=linked&person=ego");
    await expect(page.getByRole("button", { name: "Chỉnh sửa thông tin" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm quan hệ" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Thêm người thân" })).toHaveCount(0);

    await page.goto("/prototype/tree?role=reader&person=ego");
    await expect(page.getByRole("button", { name: "Chỉnh sửa thông tin" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Thêm quan hệ" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Thêm người thân" })).toHaveCount(0);
    await page.getByRole("button", { name: "Thao tác khác" }).click();
    await expect(page.getByRole("button", { name: "Tìm người" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Đổi góc nhìn" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mở hướng dẫn nhanh" })).toBeVisible();
  });

  test("tree prototype — settings modal opens via ?panel=settings", async ({
    page,
  }) => {
    await page.goto("/prototype/tree?panel=settings");
    const dialog = page.getByRole("dialog", { name: "Cài đặt" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { level: 2, name: "Cài đặt" })).toBeVisible();
    await expect(dialog.getByText("Hàng Nhựt Prototype")).toBeVisible();
    await expect(dialog.getByText("prototype@caygipha.dev")).toBeVisible();
  });

  test("tree prototype — collaboration roster shows owner and contributor identities without UUID labels", async ({ page }) => {
    await page.goto("/prototype/tree");
    await page.getByRole("button", { name: "Thao tác khác" }).click();
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

  test("help prototype — renders all current topics and working anchors", async ({ page }) => {
    await page.goto("/prototype/help");
    await expect(page.getByRole("heading", { name: "Hướng dẫn sử dụng" })).toBeVisible();
    const inviteTopic = page.getByRole("button", { name: "Mời và quản lý cộng tác" });
    await expect(inviteTopic).toBeVisible();
    await inviteTopic.click();
    await expect(page).toHaveURL(/#moi-va-quan-ly-cong-tac$/);
    await expect(
      page.getByRole("heading", { name: /Mời và quản lý cộng tác/i })
    ).toBeVisible();
    const claimTopic = page.getByRole("button", { name: /Xác nhận đây là tôi/i });
    await expect(claimTopic).toBeVisible();
    await claimTopic.click();
    await expect(page).toHaveURL(/#xac-nhan-day-la-toi$/);
    await expect(page.getByRole("heading", { name: "Xác nhận đây là tôi" })).toBeVisible();
  });

  test("claim prototype verifies with only a code and opens the target tree state", async ({ page }) => {
    const claimRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/claim/verify")) claimRequests.push(request.url());
    });
    await page.goto("/prototype/claim/example-person");
    await page.getByLabel("Mã xác nhận").fill("123456");
    await page.getByRole("button", { name: "Xác nhận đây là tôi" }).click();
    await expect(page.getByRole("status")).toContainText("Đang mở cây gia phả mẫu");
    expect(claimRequests).toEqual([]);
  });

  test("settings prototype exposes linked-node data rights without live requests", async ({ page }) => {
    const dataRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/me/")) dataRequests.push(request.url());
    });
    await page.goto("/prototype/settings");
    await expect(page.getByRole("heading", { name: "Quyền dữ liệu của bạn" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nguyễn Văn Minh" })).toBeVisible();
    expect(dataRequests).toEqual([]);
  });

  test("consent and legal prototypes remain usable in dark mode at mobile 200% text", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/prototype/consent");
    await page.evaluate(() => document.documentElement.style.fontSize = "200%");
    const dialog = page.getByRole("dialog", { name: "Điều khoản và chính sách đã được cập nhật" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Điều khoản dịch vụ" })).toHaveAttribute("href", "/legal/tos");
    await expect(dialog.getByRole("link", { name: "Chính sách quyền riêng tư" })).toHaveAttribute("href", "/legal/privacy");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Xem lại điều khoản cập nhật" })).toBeVisible();

    await page.goto("/prototype/legal/tos");
    await expect(page.getByRole("heading", { level: 1, name: "Điều khoản dịch vụ" })).toBeVisible();
    await page.goto("/prototype/legal/privacy");
    await expect(page.getByRole("heading", { level: 1, name: "Chính sách quyền riêng tư" })).toBeVisible();
  });

  test("screenshot the family tree", async ({ page }) => {
    // Set viewport to 2560x1440 for high definition screenshot
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto("/prototype/tree");
    await expect(page.locator(".tree-workspace-surface")).toHaveAttribute("data-layout", "split");
    await expect(page.getByRole("tablist", { name: "Chọn chế độ xem" })).toHaveCount(0);
    await page.waitForSelector(".tree-graph__canvas");

    // Wait for layout and animations to settle
    await page.waitForTimeout(2000);
    await page.screenshot({ path: test.info().outputPath("tree_screenshot.png") });
  });
});
