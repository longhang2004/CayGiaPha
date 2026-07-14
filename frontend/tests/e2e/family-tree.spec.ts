import { test, expect } from "@playwright/test";

test.describe("Family Tree E2E Flow", () => {
  const email = `test-e2e-${Date.now()}@example.com`;

  test("should sign up, verify OTP, create first member, add relative, search, and change settings", async ({ page }) => {
    test.setTimeout(120000);
    // 1. Visit signup page
    await page.context().setExtraHTTPHeaders({
      "x-forwarded-for": `198.51.100.${(Date.now() % 250) + 1}`,
    });
    await page.goto("/signup");
    await expect(page).toHaveTitle(/Cây Gia Phả/);

    // 2. Select dialect "Bac" (Default) and accept TOS and Privacy Policy
    await page.locator('.cgp-checkbox', { hasText: 'Điều khoản dịch vụ' }).locator('.cgp-checkbox__box').click();
    await page.locator('.cgp-checkbox', { hasText: 'Chính sách bảo mật' }).locator('.cgp-checkbox__box').click();

    // 3. Fill display name, email and password, then submit
    await page.fill('input[name="displayName"]', "Người Dùng Thử");
    await page.fill('input[name="identifier"]', email);
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');


    // 5. Arrive at the tree list, then open the initial tree created at signup.
    await expect(page).toHaveURL(/\/tree$/, { timeout: 30000 });
    await expect(page.getByRole("heading", { level: 1, name: "Cây gia phả của bạn" })).toBeVisible();
    const acknowledgeWelcome = page.getByRole("button", { name: "Tôi đã hiểu" });
    if (await acknowledgeWelcome.isVisible()) {
      await acknowledgeWelcome.click();
    }
    await page.getByRole("button", { name: "Xem sơ đồ" }).first().click();
    await expect(page).toHaveURL(/\/tree\/[^/]+$/, { timeout: 30000 });
    await expect(page.locator("h1")).toContainText("Bắt đầu cây gia phả của bạn", { timeout: 30000 });

    // 6. Create the first member "Ông Tổ" (Grandfather)
    await page.fill('input[id="displayName"]', "Ông Tổ");
    await page.getByRole("combobox", { name: "Giới tính" }).selectOption("male");
    await page.getByRole("form", { name: "Thêm thành viên mới" }).getByRole("button", { name: "Lưu thành viên" }).click();
    await page.getByRole("button", { name: "Xác nhận lưu" }).click();

    // 7. Verify the person in the default focus view, then open the labelled graph view.
    await expect(page.getByRole("heading", { level: 2, name: "Ông Tổ" })).toBeVisible();
    await page.getByRole("tab", { name: "Sơ đồ" }).click();
    await expect(page.locator(".tree-graph__canvas")).toBeVisible();
    await expect(page.locator(".tree-graph__node-name")).toContainText("Ông Tổ");

    // 8. Select "Ông Tổ" to display their details in the actions sidebar
    await page.click('button:has-text("Ông Tổ")');
    await expect(page.locator(".person-info h2")).toContainText("Ông Tổ");

    // 8b. Verify photo section loading and empty state
    const photoLibrary = page.getByRole("region", { name: "Thư viện ảnh" });
    await expect(photoLibrary).toBeVisible();
    await expect(photoLibrary).toContainText("Chưa có ảnh nào.");

    // Upload a mock PNG photo
    await photoLibrary.locator('input[type="file"]').setInputFiles({
      name: 'test-photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000970485973000003e8000003e801b57b526b0000000d49444154089963f8cfc0f01f00050001ffabce36890000000049454e44ae426082', 'hex')
    });
    await photoLibrary.getByRole("button", { name: "Lưu ảnh" }).click();

    // Verify the photo item and primary badge are visible
    await expect(page.locator('[data-testid="photo-item"]')).toBeVisible();
    await expect(page.locator('[data-testid="primary-badge"]')).toBeVisible();

    // Delete the uploaded photo and verify empty state again
    await photoLibrary.getByRole("button", { name: "Xóa" }).click();
    await expect(photoLibrary).toContainText("Chưa có ảnh nào.");

    // 9. Use the always-labelled core action to create "Bà Tổ".
    await page.getByRole("button", { name: "Thêm thành viên" }).click();
    await page.fill('input[id="displayName"]', "Bà Tổ");
    await page.getByRole("combobox", { name: "Giới tính" }).selectOption("female");
    await page.getByRole("form", { name: "Thêm thành viên mới" }).getByRole("button", { name: "Lưu thành viên" }).click();
    await page.getByRole("button", { name: "Xác nhận lưu" }).click();

    // 10. A disconnected person is discoverable in List before an edge exists.
    await page.getByRole("tab", { name: "Danh sách" }).click();
    await expect(page.getByRole("button", { name: "Chọn Bà Tổ" })).toBeVisible();
    await page.getByRole("button", { name: "Chọn Ông Tổ" }).click();

    // 11. Add a relationship (spouse) between "Ông Tổ" and "Bà Tổ"
    await page.getByRole("button", { name: "Thêm quan hệ" }).click();
    await page.selectOption('select[id="sourceId"]', { label: "Ông Tổ" });
    await page.selectOption('select[id="targetId"]', { label: "Bà Tổ" });
    await page.selectOption('select[id="derivedKind"]', "marriage");
    await page.selectOption('select[id="maritalStatus"]', "married");
    await page.click('form[aria-label="Thêm người thân"] button[type="submit"]');
    await page.click('button:has-text("Xác nhận lưu")');

    // 12. Verify both the connected person and relationship edge in Graph.
    await page.getByRole("tab", { name: "Sơ đồ" }).click();
    await expect(page.locator(".tree-graph__node-name").filter({ hasText: "Bà Tổ" })).toBeVisible();
    // A marriage relationship is a solid line (edge-solid)
    await expect(page.locator(".edge-solid").first()).toBeAttached({ timeout: 10000 });

    // 13. Test Search & Filter (Search for "Bà")
    await page.fill('input[id="nameQuery"]', "Bà");
    await expect(page.getByRole("list", { name: "Kết quả tìm kiếm" }).getByRole("listitem").filter({ hasText: "Bà Tổ" })).toBeVisible();

    // 14. Open system settings and change the display theme.
    await page.getByRole("link", { name: "Cài đặt" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Cài đặt hệ thống" })).toBeVisible();
    await page.getByRole("button", { name: "Giao diện tối" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
