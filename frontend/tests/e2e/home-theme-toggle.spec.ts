import { expect, test } from "@playwright/test";

test("homepage dark-mode switch stays a pill and moves its thumb", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");

  await page.getByRole("button", { name: "Cài đặt hiển thị và Trợ giúp" }).click();
  const toggle = page.getByRole("switch", { name: "Giao diện tối" });
  await expect(toggle).toHaveAttribute("aria-checked", "false");

  const box = await toggle.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeGreaterThanOrEqual(48);
  expect(box!.height).toBeGreaterThanOrEqual(48);
  expect(box!.width / box!.height).toBeGreaterThanOrEqual(1.5);
  await expect(toggle).toHaveCSS("justify-content", "flex-start");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("homepage graph, FAQ, and transparent hero action stay legible", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  await expect(page.locator(".home-story-lineage__connector")).toBeVisible();
  await expect(page.getByText("Bạn", { exact: true })).toBeVisible();
  const [parentBox, focusBox] = await Promise.all([
    page.getByText("Cha mẹ", { exact: true }).boundingBox(),
    page.getByText("Bạn", { exact: true }).boundingBox(),
  ]);
  expect(parentBox).toBeTruthy();
  expect(focusBox).toBeTruthy();
  expect(Math.abs(parentBox!.x + parentBox!.width / 2 - (focusBox!.x + focusBox!.width / 2))).toBeLessThanOrEqual(1);
  await expect(page.getByRole("link", { name: "Xem cách hoạt động" })).toHaveCSS(
    "color",
    "rgb(28, 26, 22)",
  );

  const question = page.getByRole("button", { name: "Dùng Cây Gia Phả có mất phí không?" });
  await question.scrollIntoViewIfNeeded();
  await expect(question).toHaveCSS("justify-content", "flex-start");
  await expect(question).toHaveCSS("text-align", "left");
  await expect(question).toHaveAttribute("aria-expanded", "false");
  await question.click();
  await expect(question).toHaveAttribute("aria-expanded", "true");
  const answer = page.locator(".home-faq__answer").first();
  await expect(answer).toHaveCSS("opacity", "1");
  expect(await answer.evaluate((element) => getComputedStyle(element).transitionProperty)).toContain(
    "grid-template-rows",
  );
});

for (const viewport of [
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
]) {
  test(`homepage FAQ wraps beside its icon on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const question = page.getByRole("button", { name: "Cây chưa đầy đủ thì có bắt đầu được không?" });
    await question.scrollIntoViewIfNeeded();
    await expect(question).toHaveCSS("justify-content", "flex-start");
    await expect(question).toHaveCSS("text-align", "left");

    const [labelBox, iconBox] = await Promise.all([
      question.locator("span").first().boundingBox(),
      question.locator(".home-faq__icon").boundingBox(),
    ]);
    expect(labelBox).toBeTruthy();
    expect(iconBox).toBeTruthy();
    expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(iconBox!.x + 1);
  });
}

test("homepage reveals marked sections once they enter the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");

  const root = page.locator(".home-landing");
  const closing = page.locator(".home-closing");
  await expect(root).toHaveClass(/home-landing--reveal-ready/);
  await expect(closing).not.toHaveClass(/is-visible/);
  await closing.scrollIntoViewIfNeeded();
  await expect(closing).toHaveClass(/is-visible/);
});
