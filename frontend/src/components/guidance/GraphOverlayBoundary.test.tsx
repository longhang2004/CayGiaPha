import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GraphOverlayBoundary, useGraphOverlay } from "./GraphOverlayBoundary";

class MockResizeObserver { observe() {} disconnect() {} }
const mutationObserve = vi.fn();
class MockMutationObserver {
  observe(_target: Node, options?: MutationObserverInit) { mutationObserve(options); }
  disconnect() {}
}

function Probe() {
  const { safeRect, spotlightLayer } = useGraphOverlay();
  return <>
    <output data-testid="safe-rect">{JSON.stringify(safeRect)}</output>
    <output data-testid="spotlight-ready">{String(Boolean(spotlightLayer))}</output>
  </>;
}

describe("GraphOverlayBoundary", () => {
  beforeEach(() => {
    mutationObserve.mockClear();
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
    expect(document.querySelector(".root")).toHaveStyle({
      "--graph-coach-bottom-inset": "100px",
    });
  });

  it("remeasures when responsive safe-area exclusions mount after hydration", () => {
    render(
      <GraphOverlayBoundary className="root" overlay={<Probe />}>
        <div>Workspace</div>
      </GraphOverlayBoundary>,
    );

    expect(mutationObserve).toHaveBeenCalledWith(expect.objectContaining({
      attributes: true,
      childList: true,
      subtree: true,
    }));
  });

  it("provides a full-root spotlight layer separately from the safe card layer", async () => {
    render(
      <GraphOverlayBoundary className="root" overlay={<Probe />}>
        <div>Workspace</div>
      </GraphOverlayBoundary>,
    );

    expect(screen.getByTestId("graph-spotlight-layer")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("spotlight-ready")).toHaveTextContent("true"));
  });
});
