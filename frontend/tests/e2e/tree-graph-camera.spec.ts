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

async function openGraph(
  page: Page,
  viewport: { width: number; height: number },
  textScale = 100,
  graphStress = false,
) {
  await page.addInitScript(({ guidance, scale }) => {
    localStorage.setItem("cgp_guidance_v2", JSON.stringify(guidance));
    localStorage.setItem("cgp_tree_workspace_view_v2", "graph");
    localStorage.setItem("cgp.textScale", String(scale));
  }, { guidance: COMPLETED_GUIDANCE, scale: textScale });
  await page.setViewportSize(viewport);
  await page.goto(graphStress ? "/prototype/tree?graphStress=1" : "/prototype/tree");

  const graphTab = page.getByRole("tab", { name: "Sơ đồ" });
  if (await graphTab.isVisible()) {
    await expect(graphTab).toHaveAttribute("aria-selected", "true");
  }
  const canvas = page.locator(".tree-graph__canvas");
  const svg = page.locator(".tree-graph__svg");
  await expect(canvas).toBeVisible();
  await expect(svg).toHaveAttribute("data-world-width", /\d/);
  return { canvas, svg };
}

async function cameraState(page: Page) {
  return page.locator(".tree-graph__svg").evaluate((svg) => {
    const canvas = svg.closest<HTMLElement>(".tree-graph__canvas")!;
    const rect = canvas.getBoundingClientRect();
    return {
      viewportWidth: rect.width,
      viewportHeight: rect.height,
      worldWidth: Number(svg.getAttribute("data-world-width")),
      worldHeight: Number(svg.getAttribute("data-world-height")),
      panX: Number(svg.getAttribute("data-camera-pan-x")),
      panY: Number(svg.getAttribute("data-camera-pan-y")),
      zoom: Number(svg.getAttribute("data-camera-zoom")),
      minZoom: Number(svg.getAttribute("data-camera-min-zoom")),
      maxZoom: Number(svg.getAttribute("data-camera-max-zoom")),
    };
  });
}

function expectedAxisPan(viewport: number, world: number, zoom: number, side: "min" | "max") {
  const scaledWorld = world * zoom;
  if (scaledWorld <= viewport - 96) {
    return (viewport - scaledWorld) / 2;
  }
  return side === "max" ? 48 : viewport - 48 - scaledWorld;
}

const RESPONSIVE_VIEWPORTS = [
  { name: "small-mobile", width: 320, height: 568 },
  { name: "mobile", width: 375, height: 667 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

for (const viewport of RESPONSIVE_VIEWPORTS) {
  test(`compact graph nodes fit without page overflow on ${viewport.name}`, async ({ page }, testInfo) => {
    await openGraph(page, viewport);

    const nodes = page.locator(".tree-graph__node foreignObject");
    await expect(nodes.first()).toHaveAttribute("width", "176");
    await expect(nodes.first()).toHaveAttribute("height", "128");
    expect(await nodes.count()).toBeGreaterThan(1);

    const geometry = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>(".tree-graph__node-button"));
      const firstCardRect = cards[0]?.getBoundingClientRect();
      const firstNodeRect = cards[0]?.closest("foreignObject")?.getBoundingClientRect();
      return {
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        overflowingCards: cards.filter((card) => (
          card.scrollWidth > card.clientWidth + 1 || card.scrollHeight > card.clientHeight + 1
        )).length,
        cardInset: firstCardRect && firstNodeRect ? {
          left: firstCardRect.left - firstNodeRect.left,
          top: firstCardRect.top - firstNodeRect.top,
          right: firstNodeRect.right - firstCardRect.right,
          bottom: firstNodeRect.bottom - firstCardRect.bottom,
        } : null,
      };
    });
    expect(geometry.documentOverflow).toBeLessThanOrEqual(1);
    expect(geometry.overflowingCards).toBe(0);
    expect(geometry.cardInset).not.toBeNull();
    expect(Math.max(...Object.values(geometry.cardInset!))).toBeLessThanOrEqual(0.5);
    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}-compact-graph.png`),
      fullPage: true,
    });
  });
}

for (const viewport of [
  { name: "mobile-200", width: 375, height: 667 },
  { name: "tablet-200", width: 768, height: 1024 },
]) {
  test(`200% text uses the tall node metric without clipping on ${viewport.name}`, async ({ page }, testInfo) => {
    const { canvas } = await openGraph(page, viewport, 200, true);

    await expect(page.locator("html")).toHaveAttribute("data-text-scale", "200");
    const nodes = page.locator(".tree-graph__node foreignObject");
    await expect(nodes.first()).toHaveAttribute("width", "208");
    await expect(nodes.first()).toHaveAttribute("height", "184");

    const egoNode = page.locator('.tree-graph__node[data-person-id="ego"]');
    await expect(egoNode).toHaveClass(/tree-graph__node--claimed/);
    await expect(egoNode.locator(".tree-graph__node-ego-badge")).toBeVisible();
    await expect(egoNode.locator(".tree-graph__node-claimed-badge")).toBeVisible();
    await expect(egoNode.locator(".tree-graph__node-name")).toHaveAttribute(
      "title",
      "Hàng Nhựt Long Gia Đình Nhánh Chính Nhiều Thế Hệ",
    );

    const branchNode = page.locator('.tree-graph__node[data-person-id="duong"]');
    await expect(branchNode).toHaveClass(/tree-graph__node--deceased/);
    await expect(branchNode).toHaveClass(/tree-graph__node--claimed/);
    await expect(branchNode).toHaveClass(/tree-graph__node--has-branch/);
    await expect(branchNode.locator(".tree-graph__node-deceased-marker")).toBeVisible();
    await expect(branchNode.locator(".tree-graph__node-claimed-badge")).toBeVisible();
    await expect(branchNode.locator(".tree-graph__node-branch-badge")).toBeVisible();
    await expect(branchNode.locator(".tree-graph__node-name")).toHaveAttribute(
      "title",
      "Nguyễn Văn Hùng Gia Đình Nhánh Mở Rộng Nhiều Thế Hệ",
    );

    const geometry = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>(".tree-graph__node-button"));
      return {
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        overflowingCards: cards.filter((card) => (
          card.scrollWidth > card.clientWidth + 1 || card.scrollHeight > card.clientHeight + 1
        )).map((card) => ({
          text: card.textContent?.trim(),
          clientWidth: card.clientWidth,
          clientHeight: card.clientHeight,
          scrollWidth: card.scrollWidth,
          scrollHeight: card.scrollHeight,
          overflowingDescendants: Array.from(card.querySelectorAll<HTMLElement>("*"))
            .filter((element) => (
              element.scrollWidth > element.clientWidth + 1 ||
              element.scrollHeight > element.clientHeight + 1
            ))
            .map((element) => ({
              className: element.className,
              clientWidth: element.clientWidth,
              clientHeight: element.clientHeight,
              scrollWidth: element.scrollWidth,
              scrollHeight: element.scrollHeight,
            })),
        })),
      };
    });
    expect(geometry.pageOverflow).toBeLessThanOrEqual(1);
    expect(geometry.overflowingCards).toEqual([]);
    await canvas.scrollIntoViewIfNeeded();
    const controlsToggle = page.getByRole("button", { name: "Điều khiển sơ đồ" });
    await expect(controlsToggle).toBeVisible();
    await controlsToggle.scrollIntoViewIfNeeded();
    const canvasBox = await canvas.boundingBox();
    const controlsBox = await controlsToggle.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();
    expect(canvasBox!.y).toBeLessThan(viewport.height);
    expect(canvasBox!.y + canvasBox!.height).toBeGreaterThan(0);
    expect(controlsBox!.x).toBeGreaterThanOrEqual(0);
    expect(controlsBox!.x + controlsBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(controlsBox!.y).toBeLessThan(viewport.height);
    expect(controlsBox!.y + controlsBox!.height).toBeGreaterThan(0);
    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}-compact-graph.png`),
      fullPage: true,
    });
  });
}

for (const viewport of RESPONSIVE_VIEWPORTS) {
  test(`camera clamps drag at all four edges on ${viewport.name}`, async ({ page }) => {
    const { canvas, svg } = await openGraph(page, viewport);
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const center = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };

    await svg.dispatchEvent("mousedown", { button: 0, clientX: center.x, clientY: center.y });
    await svg.dispatchEvent("mousemove", { clientX: 10000, clientY: 10000 });
    await svg.dispatchEvent("mouseup");
    const atMaximum = await cameraState(page);
    expect(atMaximum.panX).toBeCloseTo(
      expectedAxisPan(atMaximum.viewportWidth, atMaximum.worldWidth, atMaximum.zoom, "max"),
      1,
    );
    expect(atMaximum.panY).toBeCloseTo(
      expectedAxisPan(atMaximum.viewportHeight, atMaximum.worldHeight, atMaximum.zoom, "max"),
      1,
    );

    await svg.dispatchEvent("mousedown", { button: 0, clientX: center.x, clientY: center.y });
    await svg.dispatchEvent("mousemove", { clientX: -10000, clientY: -10000 });
    await svg.dispatchEvent("mouseup");
    const atMinimum = await cameraState(page);
    expect(atMinimum.panX).toBeCloseTo(
      expectedAxisPan(atMinimum.viewportWidth, atMinimum.worldWidth, atMinimum.zoom, "min"),
      1,
    );
    expect(atMinimum.panY).toBeCloseTo(
      expectedAxisPan(atMinimum.viewportHeight, atMinimum.worldHeight, atMinimum.zoom, "min"),
      1,
    );
  });
}

test("wheel, pinch, and buttons preserve anchors and stop at zoom limits", async ({ page }) => {
  const { canvas, svg } = await openGraph(page, { width: 1280, height: 800 });
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  const center = { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };

  await page.getByRole("button", { name: "Điều khiển sơ đồ" }).click();
  const beforeButton = await cameraState(page);
  await page.getByRole("button", { name: "Phóng to" }).click();
  const afterButton = await cameraState(page);
  expect(afterButton.zoom).toBeGreaterThan(beforeButton.zoom);
  expect((afterButton.viewportWidth / 2 - afterButton.panX) / afterButton.zoom).toBeCloseTo(
    (beforeButton.viewportWidth / 2 - beforeButton.panX) / beforeButton.zoom,
    4,
  );
  expect((afterButton.viewportHeight / 2 - afterButton.panY) / afterButton.zoom).toBeCloseTo(
    (beforeButton.viewportHeight / 2 - beforeButton.panY) / beforeButton.zoom,
    4,
  );

  const beforePinch = await cameraState(page);
  await svg.dispatchEvent("touchstart", {
    touches: [
      { identifier: 1, clientX: center.x - 50, clientY: center.y },
      { identifier: 2, clientX: center.x + 50, clientY: center.y },
    ],
  });
  await svg.dispatchEvent("touchmove", {
    touches: [
      { identifier: 1, clientX: center.x - 100, clientY: center.y },
      { identifier: 2, clientX: center.x + 100, clientY: center.y },
    ],
  });
  await svg.dispatchEvent("touchend", { touches: [] });
  const afterPinch = await cameraState(page);
  expect(afterPinch.zoom).toBeGreaterThan(beforePinch.zoom);

  for (let index = 0; index < 40; index += 1) {
    await svg.dispatchEvent("wheel", { clientX: center.x, clientY: center.y, deltaY: -100 });
  }
  const zoomedIn = await cameraState(page);
  expect(zoomedIn.zoom).toBe(2);
  expect(zoomedIn.maxZoom).toBe(2);
  await expect(page.getByRole("button", { name: "Phóng to" })).toBeDisabled();

  for (let index = 0; index < 100; index += 1) {
    await svg.dispatchEvent("wheel", { clientX: center.x, clientY: center.y, deltaY: 100 });
  }
  const zoomedOut = await cameraState(page);
  expect(zoomedOut.zoom).toBeCloseTo(zoomedOut.minZoom);
  await expect(page.getByRole("button", { name: "Thu nhỏ" })).toBeDisabled();
});
