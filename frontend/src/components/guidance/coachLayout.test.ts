import { describe, expect, it } from "vitest";
import {
  calculateCoachLayout,
  calculateSpotlightPanes,
  type CoachRect,
} from "./coachLayout";

const rect = (
  left: number,
  top: number,
  width: number,
  height: number,
): CoachRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

const intersects = (first: CoachRect, second: CoachRect) =>
  Math.max(first.left, second.left) < Math.min(first.right, second.right)
  && Math.max(first.top, second.top) < Math.min(first.bottom, second.bottom);

describe("calculateCoachLayout", () => {
  it("uses the preferred placement when the measured card fits", () => {
    const layout = calculateCoachLayout({
      boundary: rect(0, 0, 500, 500),
      target: rect(200, 100, 100, 40),
      card: { width: 240, height: 160 },
      preferredPlacement: "bottom",
    });

    expect(layout).toEqual({
      placement: "bottom",
      left: 130,
      top: 152,
      width: 240,
      maxHeight: 160,
    });
  });

  it("flips to the opposite side before reducing the card height", () => {
    const layout = calculateCoachLayout({
      boundary: rect(0, 0, 500, 500),
      target: rect(200, 380, 100, 40),
      card: { width: 240, height: 160 },
      preferredPlacement: "bottom",
    });

    expect(layout.placement).toBe("top");
    expect(layout.top).toBe(208);
    expect(layout.maxHeight).toBe(160);
  });

  it("uses the largest remaining side and only then constrains max height", () => {
    const boundary = rect(0, 0, 320, 300);
    const target = rect(20, 120, 280, 60);
    const layout = calculateCoachLayout({
      boundary,
      target,
      card: { width: 296, height: 260 },
      preferredPlacement: "bottom",
    });
    const placedCard = rect(layout.left, layout.top, layout.width, layout.maxHeight);

    expect(layout.placement).toBe("bottom");
    expect(layout.maxHeight).toBe(96);
    expect(intersects(placedCard, target)).toBe(false);
    expect(placedCard.right).toBeLessThanOrEqual(boundary.right - 12);
    expect(placedCard.bottom).toBeLessThanOrEqual(boundary.bottom - 12);
  });

  it("clamps a card into the safe boundary when the target is outside it", () => {
    const boundary = rect(100, 100, 400, 400);
    const target = rect(220, 10, 100, 50);
    const layout = calculateCoachLayout({
      boundary,
      target,
      card: { width: 240, height: 160 },
      preferredPlacement: "bottom",
    });

    expect(layout.left).toBe(50);
    expect(layout.top).toBe(12);
    expect(layout.maxHeight).toBe(160);
  });
});

describe("calculateSpotlightPanes", () => {
  it("leaves a padded cutout around the target without covering it", () => {
    const boundary = rect(0, 0, 400, 300);
    const target = rect(100, 80, 50, 40);
    const spotlight = calculateSpotlightPanes({ boundary, target });

    expect(spotlight.cutout).toEqual(rect(92, 72, 66, 56));
    expect(spotlight.panes).toEqual([
      rect(0, 0, 400, 72),
      rect(0, 128, 400, 172),
      rect(0, 72, 92, 56),
      rect(158, 72, 242, 56),
    ]);
    spotlight.panes.forEach((pane) => expect(intersects(pane, target)).toBe(false));
  });
});
