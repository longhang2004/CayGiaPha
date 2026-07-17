import { expect, test, type Page, type TestInfo } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
] as const;

const WORKSPACE_BOUNDARY_VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 667 },
  { name: "mobile-430", width: 430, height: 800 },
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

async function captureWorkspaceScreenshot(
  page: Page,
  testInfo: TestInfo,
  filename: string,
  options: { flattenGraphTrack?: boolean } = {},
) {
  const screenshotStyle = options.flattenGraphTrack
    ? `
      @media (max-width: 959px) {
        .tree-workspace-surface[data-view-mode="graph"] .tree-workspace-surface__panels {
          width: 100% !important;
          transform: none !important;
          transition: none !important;
        }
        .tree-workspace-surface[data-view-mode="graph"] .tree-workspace-surface__panel--list {
          display: none !important;
        }
        .tree-workspace-surface[data-view-mode="graph"] .tree-workspace-surface__panel--graph {
          flex: 0 0 100% !important;
        }
      }
    `
    : undefined;
  // Prime Chromium's composited workspace layers; the first capture from a
  // freshly transitioned panel can otherwise contain transient black tiles.
  await page.screenshot({ fullPage: false, style: screenshotStyle, animations: "disabled" });
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await page.screenshot({
    path: testInfo.outputPath(filename),
    fullPage: false,
    style: screenshotStyle,
    animations: "disabled",
  });
}

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

  for (const viewport of WORKSPACE_BOUNDARY_VIEWPORTS) {
    for (const mode of ["list", "graph"] as const) {
      test(`tree workspace ${mode} boundary at ${viewport.name}`, async ({ page }) => {
        await installCompletedWorkspaceGuidance(page);
        await page.addInitScript(
          (workspaceMode) => localStorage.setItem("cgp_tree_workspace_view_v2", workspaceMode),
          mode,
        );
        await page.setViewportSize(viewport);
        await page.goto("/prototype/tree");
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator(".tree-page-header")).toBeVisible();
        await page.locator(".tree-workspace-surface__panels").evaluate(async (element) => {
          await Promise.all(
            element.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
          );
        });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
          ),
        ).toBe(true);
        await captureWorkspaceScreenshot(
          page,
          test.info(),
          `${viewport.name}-tree-workspace-${mode}.png`,
          { flattenGraphTrack: mode === "graph" },
        );
      });
    }
  }

  for (const viewport of VIEWPORTS) {
    test(`tree workspace list baseline at ${viewport.name}`, async ({ page }) => {
      await installCompletedWorkspaceGuidance(page);
      await page.addInitScript(() => localStorage.setItem("cgp_tree_workspace_view_v2", "list"));
      await page.setViewportSize(viewport);
      await page.goto("/prototype/tree");
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(".tree-page-header")).toBeVisible();
      await expect(page.getByRole("button", { name: "Chọn Hàng Hữu Phương" })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        ),
      ).toBe(true);
      if (viewport.name === "desktop") {
        await expect(page.locator(".tree-workspace-surface")).toHaveAttribute("data-layout", "split");
        await expect(page.getByRole("tablist", { name: "Chọn chế độ xem" })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Điều khiển sơ đồ" })).toBeVisible();
        const footerBox = await page.locator(".tree-workspace-actions").boundingBox();
        const listBox = await page.locator(".tree-workspace-surface__panel--list").boundingBox();
        expect(footerBox).not.toBeNull();
        expect(listBox).not.toBeNull();
        expect(Math.abs(footerBox!.width - listBox!.width)).toBeLessThanOrEqual(2);
      }
      await page.locator(".tree-workspace-surface__panels").evaluate(async (element) => {
        await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
      });
      await captureWorkspaceScreenshot(
        page,
        test.info(),
        `${viewport.name}-tree-workspace-list.png`,
      );
    });

    test(`tree workspace graph baseline at ${viewport.name}`, async ({ page }) => {
      await installCompletedWorkspaceGuidance(page);
      await page.addInitScript(() => localStorage.setItem("cgp_tree_workspace_view_v2", "graph"));
      await page.setViewportSize(viewport);
      await page.goto("/prototype/tree");
      await page.evaluate(() => document.fonts.ready);
      if (viewport.name !== "desktop") {
        await expect(page.getByRole("button", { name: "Mở menu ứng dụng" })).toBeVisible();
      }
      const graphTab = page.getByRole("tab", { name: "Sơ đồ" });
      if (await graphTab.isVisible()) {
        await expect(graphTab).toHaveAttribute("aria-selected", "true");
        await expect(page.locator("#panel-graph")).not.toHaveAttribute("inert", "");
      }
      await page.locator(".tree-workspace-surface__panels").evaluate(async (element) => {
        await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
      });
      await expect(page.locator(".tree-graph__canvas")).toBeVisible();
      if (viewport.name === "mobile") {
        const controlsToggle = page.getByRole("button", { name: "Điều khiển sơ đồ" });
        await expect(controlsToggle).toBeVisible();
        const egoNodeBox = await page.locator('.tree-graph__node[data-ego="true"]').boundingBox();
        const canvasBox = await page.locator(".tree-graph__canvas").boundingBox();
        const controlsBox = await controlsToggle.boundingBox();
        const footerBox = await page.locator(".tree-workspace-actions").boundingBox();
        expect(egoNodeBox).not.toBeNull();
        expect(canvasBox).not.toBeNull();
        expect(controlsBox).not.toBeNull();
        expect(footerBox).not.toBeNull();
        expect(controlsBox!.x).toBeGreaterThanOrEqual(canvasBox!.x);
        expect(controlsBox!.x + controlsBox!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width + 1);
        expect(controlsBox!.y).toBeGreaterThanOrEqual(canvasBox!.y);
        expect(controlsBox!.y + controlsBox!.height).toBeLessThanOrEqual(footerBox!.y + 1);
        expect(egoNodeBox!.width).toBeGreaterThanOrEqual(140);
        expect(egoNodeBox!.x + egoNodeBox!.width).toBeGreaterThan(canvasBox!.x);
        expect(egoNodeBox!.x).toBeLessThan(canvasBox!.x + canvasBox!.width);
      }
      await captureWorkspaceScreenshot(
        page,
        test.info(),
        `${viewport.name}-tree-workspace-graph.png`,
        { flattenGraphTrack: true },
      );
    });

    test(`tree workspace action drawer at ${viewport.name}`, async ({ page }) => {
      await installCompletedWorkspaceGuidance(page);
      await page.setViewportSize(viewport);
      await page.goto("/prototype/tree");
      await page.getByRole("button", { name: "Thao tác khác" }).click();
      const dialog = page.getByRole("dialog", { name: "Thao tác khác" });
      await expect(dialog).toBeVisible();
      await dialog.evaluate(async (element) => {
        await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
      });
      expect(await dialog.evaluate((element) => getComputedStyle(element).backgroundColor))
        .not.toBe("rgba(0, 0, 0, 0)");
      const closeButton = page.getByRole("button", { name: "Đóng thao tác khác" });
      const closeBox = await closeButton.boundingBox();
      expect(closeBox).not.toBeNull();
      expect(closeBox!.width).toBeGreaterThanOrEqual(44);
      expect(closeBox!.height).toBeGreaterThanOrEqual(44);
      await expect(closeButton.locator("svg")).toBeVisible();
      const dialogBox = await dialog.boundingBox();
      expect(dialogBox).not.toBeNull();
      const chromeBox = await dialog.locator(".tree-workspace-action-drawer__chrome").boundingBox();
      expect(chromeBox).not.toBeNull();
      expect(chromeBox!.y - dialogBox!.y).toBeGreaterThanOrEqual(16);
      const addMemberAction = dialog.getByRole("button", { name: "Thêm thành viên khác" });
      if (await addMemberAction.isVisible()) {
        await addMemberAction.hover();
        const hoverColors = await addMemberAction.evaluate((element) => {
          const probe = document.createElement("div");
          probe.style.backgroundColor = "var(--color-brand-active)";
          document.body.appendChild(probe);
          const colors = {
            background: getComputedStyle(element).backgroundColor,
            brandActive: getComputedStyle(probe).backgroundColor,
          };
          probe.remove();
          return colors;
        });
        expect(hoverColors.background).not.toBe(hoverColors.brandActive);
        await page.mouse.move(0, 0);
      }
      if (viewport.name === "desktop") {
        expect(Math.abs(dialogBox!.x + dialogBox!.width - viewport.width)).toBeLessThanOrEqual(2);
      } else {
        expect(dialogBox!.x).toBeGreaterThanOrEqual(-1);
        expect(dialogBox!.width).toBeGreaterThanOrEqual(viewport.width - 2);
        expect(dialogBox!.y).toBeGreaterThan(60);
        expect(Math.abs(dialogBox!.y + dialogBox!.height - viewport.height)).toBeLessThanOrEqual(2);
      }
      await captureWorkspaceScreenshot(
        page,
        test.info(),
        `${viewport.name}-tree-workspace-actions.png`,
      );
    });

    test(`tree workspace person picker at ${viewport.name}`, async ({ page }) => {
      await installCompletedWorkspaceGuidance(page);
      await page.setViewportSize(viewport);
      await page.goto("/prototype/tree");
      await page.getByRole("button", { name: "Đổi người xét" }).click();
      const picker = page.getByRole("dialog", { name: "Chọn người để xét vai vế" });
      await expect(picker).toBeVisible();
      await expect(picker.locator('[data-panel-scroll-region="picker"]')).toHaveCount(1);
      const [pickerBox, chromeBox] = await Promise.all([
        picker.boundingBox(),
        picker.locator(".tree-person-picker__chrome").boundingBox(),
      ]);
      expect(pickerBox).not.toBeNull();
      expect(chromeBox).not.toBeNull();
      expect(chromeBox!.y - pickerBox!.y).toBeGreaterThanOrEqual(16);
      await captureWorkspaceScreenshot(
        page,
        test.info(),
        `${viewport.name}-tree-workspace-picker.png`,
      );
    });

    test(`tree workspace person panel at ${viewport.name}`, async ({ page }) => {
      await installCompletedWorkspaceGuidance(page);
      await page.setViewportSize(viewport);
      await page.goto("/prototype/tree");
      await page.getByRole("button", { name: "Chọn Hàng Hữu Phương" }).click();
      const panel = page.locator('.side-panel[data-panel-mode="view"]');
      await expect(panel).toBeVisible();
      await expect(panel.locator('[data-panel-scroll-region="person"]')).toHaveCount(1);
      await captureWorkspaceScreenshot(
        page,
        test.info(),
        `${viewport.name}-tree-workspace-person.png`,
      );
    });

    test(`tree workspace graph controls at ${viewport.name}`, async ({ page }) => {
      await installCompletedWorkspaceGuidance(page);
      await page.addInitScript(() => localStorage.setItem("cgp_tree_workspace_view_v2", "graph"));
      await page.setViewportSize(viewport);
      await page.goto("/prototype/tree");
      await page.getByRole("button", { name: "Điều khiển sơ đồ" }).click();
      const controls = page.locator(".tree-graph__nav-controls");
      await expect(controls).toBeVisible();
      await expect(controls.locator(".tree-graph__nav-grid > *")).toHaveCount(8);
      await captureWorkspaceScreenshot(
        page,
        test.info(),
        `${viewport.name}-tree-workspace-graph-controls.png`,
        { flattenGraphTrack: true },
      );
    });

    test(`tree workspace Coach mark at ${viewport.name}`, async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.removeItem("cgp_guidance_v2");
        localStorage.setItem("cgp_tree_workspace_view_v2", "list");
      });
      await page.setViewportSize(viewport);
      await page.goto("/prototype/tree");
      await page.evaluate(() => document.fonts.ready);
      const coach = page.getByRole("dialog", { name: "Hướng dẫn nhanh" });
      await expect(coach).toBeVisible();
      const [coachBox, headerBox, footerBox] = await Promise.all([
        coach.boundingBox(),
        page.locator(".tree-page-header").boundingBox(),
        page.locator(".tree-workspace-actions").boundingBox(),
      ]);
      expect(coachBox && headerBox && footerBox).toBeTruthy();
      expect(coachBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
      expect(coachBox!.y + coachBox!.height).toBeLessThanOrEqual(footerBox!.y + 1);
      const tabs = page.getByRole("tablist", { name: "Chọn chế độ xem" });
      if (await tabs.isVisible()) {
        const tabsBox = await tabs.boundingBox();
        expect(tabsBox).not.toBeNull();
        expect(coachBox!.y).toBeGreaterThanOrEqual(tabsBox!.y + tabsBox!.height - 1);
      }
      await captureWorkspaceScreenshot(
        page,
        test.info(),
        `${viewport.name}-tree-workspace-coach.png`,
      );
      await coach.getByRole("button", { name: /Tiếp theo|Hoàn tất/ }).click();
    });
  }
});
