import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const OUTPUT_DIR = path.resolve(
  process.cwd(),
  "../docs/research/ux-baseline-2026-07-13/screenshots",
);

const ROUTES = [
  {
    name: "tree-list-empty",
    href: "/prototype/tree-list?welcome=open&trees=none",
  },
  { name: "tree-owner", href: "/prototype/tree?person=ego" },
  { name: "tree-empty", href: "/prototype/tree/empty" },
  { name: "help", href: "/prototype/help" },
] as const;

const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 568 },
  { name: "mobile-375", width: 375, height: 667 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

interface TargetFinding {
  label: string;
  tag: string;
  width: number;
  height: number;
}

interface Measurement {
  route: string;
  viewport: string;
  horizontalOverflow: boolean;
  minimumTarget: { width: number; height: number } | null;
  targetsBelow44: TargetFinding[];
}

interface ReflowMeasurement {
  route: string;
  viewportWidth: number;
  viewportHeight: number;
  documentWidth: number;
  documentHeight: number;
  bodyWidth: number;
  bodyHeight: number;
  mainClientHeight: number | null;
  mainScrollHeight: number | null;
  mainOverflowY: string | null;
}

const measurements: Measurement[] = [];
const reflowMeasurements: ReflowMeasurement[] = [];

async function preparePage(
  page: Page,
  options: { theme: "light" | "dark"; textScale: number },
) {
  await page.emulateMedia({
    colorScheme: options.theme,
    reducedMotion: "reduce",
  });
  await page.addInitScript(
    ({ theme, textScale }) => {
      window.localStorage.setItem("theme", theme);
      window.localStorage.setItem("cgp.textScale", String(textScale));
    },
    options,
  );
}

async function settleAndDismissWelcome(
  page: Page,
) {
  await page.evaluate(() => document.fonts.ready);
  const acknowledge = page.getByRole("button", { name: "Tôi đã hiểu" });
  if ((await acknowledge.count()) === 1 && (await acknowledge.isVisible())) {
    await acknowledge.click();
  }
}

test.describe("older-adult mobile UX baseline", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    await mkdir(OUTPUT_DIR, { recursive: true });
  });

  for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
      test(`${route.name} at ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await preparePage(page, { theme: "light", textScale: 100 });

        const response = await page.goto(route.href);
        expect(response?.status()).toBe(200);
        await settleAndDismissWelcome(page);

        const measurement = await page.evaluate(() => {
          const interactiveSelector = [
            "button",
            "a[href]",
            "input",
            "select",
            "textarea",
            "[role='button']",
          ].join(",");
          const targets = Array.from(
            document.querySelectorAll<HTMLElement>(interactiveSelector),
          )
            .filter((element) => {
              const style = window.getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                rect.width > 0 &&
                rect.height > 0 &&
                rect.bottom > 0 &&
                rect.right > 0 &&
                rect.top < window.innerHeight &&
                rect.left < window.innerWidth
              );
            })
            .map((element) => {
              const input = element instanceof HTMLInputElement ? element : null;
              const associatedLabel =
                input?.id && (input.type === "checkbox" || input.type === "radio")
                  ? document.querySelector<HTMLLabelElement>(
                      `label[for="${CSS.escape(input.id)}"]`,
                    )
                  : null;
              const elementRect = element.getBoundingClientRect();
              const labelRect = associatedLabel?.getBoundingClientRect();
              const rect =
                labelRect &&
                labelRect.width >= elementRect.width &&
                labelRect.height >= elementRect.height
                  ? labelRect
                  : elementRect;
              return {
                label: (
                  element.getAttribute("aria-label") ||
                  element.innerText ||
                  element.getAttribute("title") ||
                  element.getAttribute("name") ||
                  element.tagName
                )
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 100),
                tag: element.tagName.toLowerCase(),
                width: Math.round(rect.width * 10) / 10,
                height: Math.round(rect.height * 10) / 10,
              };
            });

          const widths = targets.map((target) => target.width);
          const heights = targets.map((target) => target.height);

          return {
            horizontalOverflow:
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth + 1,
            minimumTarget:
              targets.length > 0
                ? {
                    width: Math.min(...widths),
                    height: Math.min(...heights),
                  }
                : null,
            targetsBelow44: targets.filter(
              (target) => target.width < 44 || target.height < 44,
            ),
          };
        });

        // Check horizontal overflow (allowing 1px border/scrollbar room)
        const overflow = await page.evaluate(() => {
          const docScroll = document.documentElement.scrollWidth;
          const bodyScroll = document.body.scrollWidth;
          const viewportWidth = window.innerWidth;
          return {
            docScroll,
            bodyScroll,
            viewportWidth,
          };
        });
        expect(overflow.docScroll, `documentElement scrollWidth ${overflow.docScroll} should not exceed viewport ${overflow.viewportWidth} at 100% text scale`).toBeLessThanOrEqual(overflow.viewportWidth + 1);
        expect(overflow.bodyScroll, `body scrollWidth ${overflow.bodyScroll} should not exceed viewport ${overflow.viewportWidth} at 100% text scale`).toBeLessThanOrEqual(overflow.viewportWidth + 1);

        // Check overlaps
        const overlaps = await page.evaluate(() => {
          const getRect = (sel: string) => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            if (style.display === "none" || style.visibility === "hidden" || rect.width === 0 || rect.height === 0) {
              return null;
            }
            return rect;
          };

          const header = getRect(".tree-page-header");
          const switcher = getRect(".view-switcher");
          const panel = getRect(".tree-workspace__info-panel--open");
          const focusContent = getRect(".tree-focus-view") || getRect(".tree-people-list");

          const intersect = (r1: DOMRect | null, r2: DOMRect | null) => {
            if (!r1 || !r2) return false;
            return !(
              r1.right <= r2.left ||
              r1.left >= r2.right ||
              r1.bottom <= r2.top ||
              r1.top >= r2.bottom
            );
          };

          const list: string[] = [];
          if (intersect(header, switcher)) list.push("Header overlaps View Switcher");
          if (intersect(header, panel)) list.push("Header overlaps Open Info Panel");
          if (intersect(switcher, panel)) list.push("View Switcher overlaps Open Info Panel");
          if (intersect(switcher, focusContent)) list.push("View Switcher overlaps active view content");
          if (switcher && (switcher.left < 0 || switcher.right > window.innerWidth)) {
            list.push("View Switcher extends outside viewport");
          }
          return list;
        });
        expect(overlaps, `Overlaps detected: ${overlaps.join(", ")}`).toEqual([]);

        measurements.push({
          route: route.name,
          viewport: viewport.name,
          ...measurement,
        });

        await page.screenshot({
          path: path.join(
            OUTPUT_DIR,
            `${viewport.name}-${route.name}-light-100.png`,
          ),
          fullPage: true,
          animations: "disabled",
        });
      });
    }
  }

  for (const route of ROUTES) {
    test(`${route.name} at mobile 200% text`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await preparePage(page, { theme: "light", textScale: 200 });
      const response = await page.goto(route.href);
      expect(response?.status()).toBe(200);
      await settleAndDismissWelcome(page);
      await expect(page.locator("html")).toHaveAttribute("data-text-scale", "200");
      // Check horizontal overflow (allowing 1px border/scrollbar room)
      const overflow = await page.evaluate(() => {
        const docScroll = document.documentElement.scrollWidth;
        const bodyScroll = document.body.scrollWidth;
        const viewportWidth = window.innerWidth;
        const overflowingElements = Array.from(document.body.querySelectorAll<HTMLElement>("*"))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              selector: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}${Array.from(element.classList).slice(0, 2).map((name) => `.${name}`).join("")}`,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            };
          })
          .filter((item) => item.left < -1 || item.right > viewportWidth + 1)
          .sort((a, b) => b.width - a.width)
          .slice(0, 8);
        return {
          docScroll,
          bodyScroll,
          viewportWidth,
          overflowingElements,
        };
      });
      expect(overflow.docScroll, `documentElement scrollWidth ${overflow.docScroll} should not exceed viewport ${overflow.viewportWidth} at 200% text scale; offenders: ${JSON.stringify(overflow.overflowingElements)}`).toBeLessThanOrEqual(overflow.viewportWidth + 1);
      expect(overflow.bodyScroll, `body scrollWidth ${overflow.bodyScroll} should not exceed viewport ${overflow.viewportWidth} at 200% text scale`).toBeLessThanOrEqual(overflow.viewportWidth + 1);

      // Check overlaps
      const overlaps = await page.evaluate(() => {
        const getRect = (sel: string) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          if (style.display === "none" || style.visibility === "hidden" || rect.width === 0 || rect.height === 0) {
            return null;
          }
          return rect;
        };

        const header = getRect(".tree-page-header");
        const switcher = getRect(".view-switcher");
        const panel = getRect(".tree-workspace__info-panel--open");
        const focusContent = getRect(".tree-focus-view") || getRect(".tree-people-list");

        const intersect = (r1: DOMRect | null, r2: DOMRect | null) => {
          if (!r1 || !r2) return false;
          return !(
            r1.right <= r2.left ||
            r1.left >= r2.right ||
            r1.bottom <= r2.top ||
            r1.top >= r2.bottom
          );
        };

        const list: string[] = [];
        if (intersect(header, switcher)) list.push("Header overlaps View Switcher");
        if (intersect(header, panel)) list.push("Header overlaps Open Info Panel");
        if (intersect(switcher, panel)) list.push("View Switcher overlaps Open Info Panel");
        if (intersect(switcher, focusContent)) list.push("View Switcher overlaps active view content");
        if (switcher && (switcher.left < 0 || switcher.right > window.innerWidth)) {
          list.push("View Switcher extends outside viewport");
        }
        return list;
      });
      expect(overlaps, `Overlaps detected: ${overlaps.join(", ")}`).toEqual([]);

      reflowMeasurements.push({
        route: route.name,
        ...(await page.evaluate(() => {
          const main = document.querySelector<HTMLElement>("main");
          return {
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            documentWidth: document.documentElement.scrollWidth,
            documentHeight: document.documentElement.scrollHeight,
            bodyWidth: document.body.scrollWidth,
            bodyHeight: document.body.scrollHeight,
            mainClientHeight: main?.clientHeight ?? null,
            mainScrollHeight: main?.scrollHeight ?? null,
            mainOverflowY: main ? window.getComputedStyle(main).overflowY : null,
          };
        })),
      });
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `mobile-375-${route.name}-light-200.png`),
        fullPage: true,
        animations: "disabled",
      });
    });

    test(`${route.name} at mobile dark reduced-motion`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await preparePage(page, { theme: "dark", textScale: 100 });
      const response = await page.goto(route.href);
      expect(response?.status()).toBe(200);
      await settleAndDismissWelcome(page);
      await expect(page.locator("html")).toHaveClass(/dark/);
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `mobile-375-${route.name}-dark-100.png`),
        fullPage: true,
        animations: "disabled",
      });
    });
  }

  test.afterAll(async () => {
    await writeFile(
      path.resolve(OUTPUT_DIR, "../measurements.json"),
      `${JSON.stringify(measurements, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      path.resolve(OUTPUT_DIR, "../reflow-measurements.json"),
      `${JSON.stringify(reflowMeasurements, null, 2)}\n`,
      "utf8",
    );
  });
});
