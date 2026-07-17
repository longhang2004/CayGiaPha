import { createRef } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHelpTopic } from "@/content/help/helpTopics";
import type { CoachMarkSequenceState } from "./CoachMarkSequence";
import {
  AnchoredCoachMark,
  ensureTargetVisibleInScrollRegion,
} from "./AnchoredCoachMark";

class MockResizeObserver {
  observe() {}
  disconnect() {}
}

const domRect = (
  left: number,
  top: number,
  width: number,
  height: number,
) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
  x: left,
  y: top,
  toJSON: () => ({}),
}) as DOMRect;

function sequenceFor(anchor: HTMLElement): CoachMarkSequenceState {
  const topic = getHelpTopic("doi-diem-nhin", "reader");
  if (!topic) throw new Error("Expected canonical Help topic");
  return {
    currentStep: {
      topicId: topic.id,
      topic,
      anchor,
      anchorId: "target",
      anchorIds: ["target"],
      preferredPlacement: "bottom",
    },
    currentAnchor: anchor,
    currentAnchorId: "target",
    currentTopic: topic,
    index: 0,
    count: 1,
    active: true,
    isFirst: true,
    isLast: true,
    helpHref: "/help",
    skipButtonRef: createRef<HTMLButtonElement>(),
    skip: vi.fn(),
    back: vi.fn(),
    nextOrComplete: vi.fn(),
  };
}

describe("ensureTargetVisibleInScrollRegion", () => {
  it("scrolls only the owning panel enough to reveal a target below it", () => {
    const scrollRegion = document.createElement("div");
    scrollRegion.dataset.panelScrollRegion = "person";
    const target = document.createElement("button");
    scrollRegion.append(target);
    document.body.append(scrollRegion);
    scrollRegion.scrollTop = 10;
    vi.spyOn(scrollRegion, "getBoundingClientRect").mockReturnValue(domRect(0, 100, 300, 200));
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue(domRect(20, 330, 260, 48));

    ensureTargetVisibleInScrollRegion(target);

    expect(scrollRegion.scrollTop).toBe(100);
    scrollRegion.remove();
  });
});

describe("AnchoredCoachMark", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  it("positions the measured card and renders a non-interactive four-pane spotlight", async () => {
    const boundary = document.createElement("div");
    boundary.dataset.testBoundary = "true";
    const target = document.createElement("button");
    target.dataset.guidanceAnchor = "target";
    boundary.append(target);
    document.body.append(boundary);

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this === boundary) return domRect(0, 0, 500, 500);
      if (this === target) return domRect(200, 100, 100, 40);
      if (this.classList.contains("workspace-coach")) return domRect(0, 0, 240, 160);
      return domRect(0, 0, 0, 0);
    });

    render(
      <AnchoredCoachMark
        sequence={sequenceFor(target)}
        cardBoundary={boundary}
        spotlightBoundary={boundary}
        spotlightHost={boundary}
      />,
    );

    const coach = await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" });
    await waitFor(() => expect(coach).toHaveStyle({
      left: "130px",
      top: "152px",
      width: "240px",
      maxHeight: "160px",
      right: "auto",
      bottom: "auto",
    }));
    const panes = boundary.querySelectorAll("[data-coach-spotlight-pane]");
    expect(panes).toHaveLength(4);
    panes.forEach((pane) => {
      expect(pane).toHaveAttribute("aria-hidden", "true");
      expect(pane).toHaveClass("workspace-coach-spotlight__pane");
      expect(pane).toHaveStyle({ pointerEvents: "none" });
    });
    const cutout = boundary.querySelector("[data-coach-spotlight-cutout]");
    expect(cutout).toHaveStyle({ pointerEvents: "none" });
    expect(cutout).toHaveStyle({
      left: "192px",
      top: "92px",
      width: "116px",
      height: "56px",
    });
    boundary.remove();
  });

  it("repositions a visible target within its owner when the Coach chrome cannot fit", async () => {
    const boundary = document.createElement("div");
    boundary.dataset.panelScrollRegion = "actions";
    boundary.scrollTop = 100;
    const target = document.createElement("button");
    target.dataset.guidanceAnchor = "target";
    boundary.append(target);
    document.body.append(boundary);

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this === boundary) return domRect(0, 0, 300, 300);
      if (this === target) return domRect(20, 220 - boundary.scrollTop, 260, 100);
      if (this.classList.contains("workspace-coach")) return domRect(0, 0, 240, 260);
      if (this.classList.contains("workspace-coach__progress")) return domRect(0, 0, 100, 30);
      if (this.classList.contains("workspace-coach__actions")) return domRect(0, 0, 220, 50);
      return domRect(0, 0, 0, 0);
    });

    render(
      <AnchoredCoachMark
        sequence={sequenceFor(target)}
        cardBoundary={boundary}
        spotlightBoundary={boundary}
      />,
    );

    const coach = await screen.findByRole("dialog", { name: "Hướng dẫn nhanh" });
    await waitFor(() => expect(boundary.scrollTop).toBe(32));
    await waitFor(() => expect(coach).toHaveStyle({
      top: "12px",
      maxHeight: "164px",
      bottom: "auto",
    }));
    boundary.remove();
  });
});
