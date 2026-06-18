import { test, expect } from "@playwright/test";

test.describe("Family Tree E2E Flow", () => {
  const email = `test-e2e-${Date.now()}@example.com`;

  test("should sign up, verify OTP, create first member, add relative, search, and change settings", async ({ page }) => {
    // 1. Visit signup page
    await page.goto("/signup");
    await expect(page).toHaveTitle(/Cây Gia Phả/);

    // 2. Select dialect "Bac" (Default) and accept TOS and Privacy Policy
    await page.locator('input[type="checkbox"]').first().check();
    await page.locator('input[type="checkbox"]').last().check();

    // 3. Fill email and request verification code
    await page.fill('input[type="email"], input[type="text"]', email);
    await page.click('button[type="submit"]');

    // 4. Input Mock OTP code "123456" and click verify
    await page.fill('input[type="text"]', "123456");
    await page.click('button[type="submit"]');

    // 5. Arrive at tree page (should display empty tree setup first)
    await expect(page).toHaveURL(/\/tree/);
    await expect(page.locator("h1")).toContainText("Bắt đầu cây gia phả của bạn");

    // 6. Create the first member "Ông Tổ" (Grandfather)
    await page.fill('input[id="displayName"]', "Ông Tổ");
    await page.locator('input[id="gender-male"]').check();
    await page.click('button[type="submit"]');

    // 7. Verify the node "Ông Tổ" is created and loaded onto the tree canvas
    await expect(page.locator(".tree-graph__canvas")).toBeVisible();
    await expect(page.locator(".tree-graph__node-name")).toContainText("Ông Tổ");

    // 8. Select "Ông Tổ" to display their details in the actions sidebar
    await page.click('button:has-text("Ông Tổ")');
    await expect(page.locator(".person-info h2")).toContainText("Ông Tổ");

    // 8b. Verify photo section loading and empty state
    await expect(page.locator('section[aria-label="Ảnh"]')).toBeVisible();
    await expect(page.locator('section[aria-label="Ảnh"]')).toContainText("Chưa có ảnh nào.");

    // Upload a mock PNG photo
    await page.setInputFiles('input[type="file"]', {
      name: 'test-photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000970485973000003e8000003e801b57b526b0000000d49444154089963f8cfc0f01f00050001ffabce36890000000049454e44ae426082', 'hex')
    });

    // Verify the photo item and primary badge are visible
    await expect(page.locator('[data-testid="photo-item"]')).toBeVisible();
    await expect(page.locator('[data-testid="primary-badge"]')).toBeVisible();

    // Delete the uploaded photo and verify empty state again
    await page.click('section[aria-label="Ảnh"] button:has-text("Xóa")');
    await expect(page.locator('section[aria-label="Ảnh"]')).toContainText("Chưa có ảnh nào.");

    // 9. Click "Tạo thành viên mới" when no node is selected to create "Bà Tổ"
    await page.click('button:has-text("Bỏ chọn")');
    await page.click('button:has-text("Tạo thành viên mới")');
    await page.fill('input[id="displayName"]', "Bà Tổ");
    await page.locator('input[id="gender-female"]').check();
    await page.click('button[type="submit"]');

    // 10. Verify "Bà Tổ" is also visible in the tree canvas
    await expect(page.locator(".tree-graph__node-name").filter({ hasText: "Bà Tổ" })).toBeVisible();

    // 11. Add a relationship (spouse) between "Ông Tổ" and "Bà Tổ"
    await page.click('button:has-text("Thêm quan hệ mới")');
    await page.selectOption('select[id="sourceId"]', { label: "Ông Tổ" });
    await page.selectOption('select[id="targetId"]', { label: "Bà Tổ" });
    await page.selectOption('select[id="derivedKind"]', "marriage");
    await page.selectOption('select[id="maritalStatus"]', "married");
    await page.click('button[type="submit"]');

    // 12. Verify the relationship edge is created
    // A marriage relationship is a solid line (edge-solid)
    await expect(page.locator(".edge-solid").first()).toBeVisible();

    // 13. Test Search & Filter (Search for "Bà")
    await page.fill('input[id="nameQuery"]', "Bà");
    await page.click('form[aria-label="Tìm kiếm"] button[type="submit"]');
    await expect(page.locator("ul li")).toContainText("Bà Tổ");

    // 14. Test Dialect change (change default region to Nam)
    const regionSelect = page.locator("select[id='region-select']");
    await regionSelect.selectOption("Nam");
    await expect(page.locator("[data-testid='region-saved']")).toContainText("Đã lưu vùng.");
  });
});
