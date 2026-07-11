import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GraphOverlayBoundary, useGraphOverlay } from "./GraphOverlayBoundary";

class MockResizeObserver { observe() {} disconnect() {} }
class MockMutationObserver { observe() {} disconnect() {} }

function Probe() {
  const { safeRect } = useGraphOverlay();
  return <output data-testid="safe-rect">{JSON.stringify(safeRect)}</output>;
}

describe("GraphOverlayBoundary", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    vi.stubGlobal("MutationObserver", MockMutationObserver);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.dataset.graphSafeExclude === "bottom") return { left: 0, top: 700, right: 1000, bottom: 800, width: 1000, height: 100 } as DOMRect;
      if (this.dataset.graphSafeExclude === "right") return { left: 920, top: 0, right: 1000, bottom: 700, width: 80, height: 700 } as DOMRect;
      if (this.dataset.graphSafeExternal === "top") return { left: 0, top: 0, right: 1000, bottom: 60, width: 1000, height: 60 } as DOMRect;
      return { left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800 } as DOMRect;
    });
  });

  it("subtracts bottom toolbar and right graph controls", async () => {
    render(<>
      <div data-graph-safe-external="top" />
      <GraphOverlayBoundary className="root" overlay={<Probe />}>
          <div data-graph-safe-exclude="bottom" />
          <div data-graph-safe-exclude="right" />
      </GraphOverlayBoundary>
    </>,
    );
    await waitFor(() => expect(screen.getByTestId("safe-rect")).toHaveTextContent('"right":908'));
    expect(screen.getByTestId("safe-rect")).toHaveTextContent('"bottom":688');
    expect(screen.getByTestId("safe-rect")).toHaveTextContent('"top":72');
  });
});
