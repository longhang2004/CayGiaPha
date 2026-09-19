import { expect, test, type Page } from "@playwright/test";

const COMPLETED_GUIDANCE = {
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
};

async function openWorkspace(
  page: Page,
  viewport: { width: number; height: number },
  textScale = 100,
) {
  await page.addInitScript(({ guidance, scale }) => {
    localStorage.setItem("cgp_guidance_v2", JSON.stringify(guidance));
    localStorage.setItem("cgp_tree_workspace_view_v2", "list");
    localStorage.setItem("cgp.textScale", String(scale));
  }, { guidance: COMPLETED_GUIDANCE, scale: textScale });
  await page.setViewportSize(viewport);
  await page.goto("/prototype/tree");
  await expect(page.getByRole("searchbox", { name: "Tìm theo tên hoặc cách xưng hô" })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }));
  expect(overflow.document).toBeLessThanOrEqual(1);
  expect(overflow.body).toBeLessThanOrEqual(1);
}

for (const viewport of [
  { name: "small-mobile", width: 320, height: 568 },
  { name: "mobile", width: 375, height: 667 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
]) {
  test(`member intents and panel navigation stay distinct on ${viewport.name}`, async ({ page }, testInfo) => {
    await openWorkspace(page, viewport);

    const searchChrome = page.locator(".tree-people-list__search-chrome");
    const listScroll = page.locator('[data-panel-scroll-region="people-list"]');
    const filterButton = page.getByRole("button", { name: "Mở bộ lọc thành viên" });
    await expect(page.getByRole("button", { name: "Tìm bằng giọng nói" })).toHaveCount(0);
    await expect(filterButton).toBeVisible();
    const searchChromeBox = await searchChrome.boundingBox();
    expect(searchChromeBox).not.toBeNull();
    for (const control of [filterButton]) {
      const box = await control.boundingBox();
      const iconBox = await control.locator("svg").boundingBox();
      expect(box).not.toBeNull();
      expect(iconBox).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(iconBox!.width).toBeGreaterThanOrEqual(18);
      expect(iconBox!.height).toBeGreaterThanOrEqual(18);
      expect(box!.x).toBeGreaterThanOrEqual(searchChromeBox!.x);
      expect(box!.x + box!.width).toBeLessThanOrEqual(searchChromeBox!.x + searchChromeBox!.width + 1);
    }
    await searchChrome.screenshot({ path: testInfo.outputPath(`${viewport.name}-member-search.png`) });
    const chromeBefore = await searchChrome.boundingBox();
    await listScroll.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    const chromeAfter = await searchChrome.boundingBox();
    expect(chromeBefore).not.toBeNull();
    expect(chromeAfter).not.toBeNull();
    expect(Math.abs(chromeBefore!.y - chromeAfter!.y)).toBeLessThanOrEqual(1);

    const search = page.getByRole("searchbox", { name: "Tìm theo tên hoặc cách xưng hô" });
    await search.fill("huu phuong");
    await expect(page.getByRole("heading", { name: "Kết quả" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Chọn Hàng Hữu Phương" })).toBeVisible();
    await page.getByRole("button", { name: "Xóa tìm kiếm và bộ lọc" }).click();

    await page.getByRole("button", { name: "Thêm người mới" }).click();
    const addPanel = page.locator('.side-panel[data-panel-mode="add-person"]');
    await expect(addPanel).toBeVisible();
    await expect(addPanel.getByRole("form", { name: "Thêm người mới" })).toBeVisible();
    await expect(addPanel.getByText("Quan hệ khác")).toHaveCount(0);
    await addPanel.getByText("Thêm thông tin khác").click();
    await expect(addPanel.getByRole("button", { name: /Chọn ảnh/ })).toBeVisible();
    await expect(addPanel.locator('input[type="file"]')).toHaveAttribute(
      "accept",
      "image/jpeg,image/png",
    );
    await addPanel.locator(".photo-file-picker").screenshot({
      path: testInfo.outputPath(`${viewport.name}-photo-picker.png`),
    });
    const addBackIconBox = await addPanel
      .getByRole("button", { name: "Quay lại thông tin thành viên" })
      .locator("svg")
      .boundingBox();
    expect(addBackIconBox).not.toBeNull();
    expect(addBackIconBox!.width).toBeGreaterThanOrEqual(18);
    await addPanel.screenshot({ path: testInfo.outputPath(`${viewport.name}-add-person-panel.png`) });
    await addPanel.getByRole("button", { name: "Quay lại thông tin thành viên" }).click();
    await expect(page.locator('.side-panel[data-panel-mode="view"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm người mới" })).toBeFocused();
    await page.getByRole("button", { name: "Đóng bảng thông tin thành viên" }).click();
    await expect(page.locator(".tree-workspace__info-panel--open")).toHaveCount(0);

    await search.fill("huu phuong");
    await page.getByRole("button", { name: "Chọn Hàng Hữu Phương" }).click();
    const viewPanel = page.locator('.side-panel[data-panel-mode="view"]');
    await expect(viewPanel).toBeVisible();
    await viewPanel.getByRole("button", { name: "Cập nhật quan hệ" }).click();
    const relationshipPanel = page.locator('.side-panel[data-panel-mode="update-relationship"]');
    await expect(relationshipPanel.getByRole("form", { name: "Cập nhật quan hệ" })).toBeVisible();
    await expect(relationshipPanel.getByText("Quan hệ khác")).toHaveCount(0);
    await relationshipPanel.screenshot({ path: testInfo.outputPath(`${viewport.name}-update-relationship-panel.png`) });
    await relationshipPanel.getByRole("button", { name: "Quay lại thông tin thành viên" }).click();
    await expect(viewPanel).toBeVisible();
    await expect(viewPanel.getByRole("button", { name: "Cập nhật quan hệ" })).toBeFocused();

    await viewPanel.getByRole("button", { name: "Ghi cách gọi" }).click();
    const assertedPanel = page.locator('.side-panel[data-panel-mode="asserted-label"]');
    await expect(
      assertedPanel.getByRole("form", { name: "Ghi cách gọi khi chưa rõ đường nối" }),
    ).toBeVisible();
    await expect(assertedPanel.getByText(/chưa biết ông bà trung gian/i)).toBeVisible();
    await assertedPanel.getByRole("textbox", { name: "Cách gọi" }).fill("bác");
    await assertedPanel.getByRole("button", { name: "Ghi cách gọi" }).click();
    await expect(assertedPanel.getByText(/Hàng Hữu Phương gọi .* là bác/)).toBeVisible();
    await assertedPanel.screenshot({ path: testInfo.outputPath(`${viewport.name}-asserted-label-panel.png`) });
    await assertedPanel.getByRole("button", { name: "Quay lại thông tin thành viên" }).click();
    await assertedPanel.getByRole("button", { name: "Bỏ thay đổi" }).click();
    await expect(viewPanel).toBeVisible();
    await expect(viewPanel.getByRole("button", { name: "Ghi cách gọi" })).toBeFocused();

    await viewPanel.getByRole("button", { name: "Cập nhật quan hệ" }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator(".tree-workspace__info-panel--open")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
}

test("member discovery and split flows remain legible in mobile dark mode", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await openWorkspace(page, { width: 375, height: 667 });
  await expect(page.getByRole("button", { name: "Tìm bằng giọng nói" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mở bộ lọc thành viên" }).locator("svg")).toBeVisible();
  await page.getByRole("button", { name: "Thêm người mới" }).click();
  const panel = page.locator('.side-panel[data-panel-mode="add-person"]');
  await expect(panel).toBeVisible();
  await panel.getByText("Thêm thông tin khác").click();
  await expect(panel.getByRole("button", { name: /Chọn ảnh/ })).toBeVisible();
  await panel.locator(".photo-file-picker").screenshot({
    path: testInfo.outputPath("mobile-dark-photo-picker.png"),
  });
  await panel.locator('input[type="file"]').setInputFiles({
    name: "anh-gia-dinh.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cfc0000003010100c9fe92ef0000000049454e44ae426082",
      "hex",
    ),
  });
  await expect(panel.getByRole("img", { name: "Xem trước anh-gia-dinh.png" })).toBeVisible();
  await panel.locator(".photo-file-picker").screenshot({
    path: testInfo.outputPath("mobile-dark-photo-picker-selected.png"),
  });
  await panel.getByRole("button", { name: "Bỏ ảnh" }).click();
  await expect(panel.getByRole("button", { name: /Chọn ảnh/ })).toBeVisible();
  await panel.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
  });
  expect(await panel.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe("rgba(0, 0, 0, 0)");
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("mobile-dark-add-person.png"), fullPage: true });
});

for (const viewport of [
  { name: "mobile-200", width: 375, height: 667 },
  { name: "tablet-200", width: 768, height: 1024 },
]) {
  test(`member discovery and add-person panel remain usable at 200% on ${viewport.name}`, async ({ page }, testInfo) => {
    await openWorkspace(page, viewport, 200);
    await expect(page.locator("html")).toHaveAttribute("data-text-scale", "200");
    await page.getByRole("searchbox", { name: "Tìm theo tên hoặc cách xưng hô" }).fill("phuong");
    await expect(page.getByRole("button", { name: "Chọn Hàng Hữu Phương" })).toBeVisible();
    await page.getByRole("button", { name: "Xóa tìm kiếm và bộ lọc" }).click();
    await page.getByRole("button", { name: "Thêm người mới" }).click();
    const panel = page.locator('.side-panel[data-panel-mode="add-person"]');
    await expect(panel).toBeVisible();
    await panel.evaluate(async (element) => {
      await Promise.all(
        element.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
      );
    });
    await panel.getByText("Thêm thông tin khác").click();
    await expect(panel.getByRole("button", { name: /Chọn ảnh/ })).toBeVisible();
    await panel.locator(".photo-file-picker").screenshot({
      path: testInfo.outputPath(`${viewport.name}-photo-picker.png`),
    });
    await expect(panel.getByRole("button", { name: "Quay lại thông tin thành viên" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Đóng bảng thông tin thành viên" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}-add-person-200.png`), fullPage: true });
  });
}
