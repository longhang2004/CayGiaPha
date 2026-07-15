import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTreeGraphZoom } from "./useTreeGraphZoom";

let containerWidth = 500;
let containerHeight = 300;
let resizeCallback: ResizeObserverCallback | null = null;
const positions = new Map([["ego", { x: 100, y: 100 }]]);

function GraphZoomHarness() {
  const graph = useTreeGraphZoom(
    1000,
    2000,
    1,
    positions,
    "ego",
  );

  return (
    <div ref={graph.containerRef}>
      <output
        data-testid="graph-state"
        data-pan-x={graph.pan.x}
        data-pan-y={graph.pan.y}
        data-zoom={graph.zoom}
      />
      <button type="button" onClick={graph.handleZoomIn}>Phóng to</button>
      <button type="button" onClick={graph.handleZoomOut}>Thu nhỏ</button>
      <button type="button" onClick={graph.handleReset}>Đặt lại</button>
    </div>
  );
}

function readGraphState() {
  const state = screen.getByTestId("graph-state");
  return {
    panX: Number(state.getAttribute("data-pan-x")),
    panY: Number(state.getAttribute("data-pan-y")),
    zoom: Number(state.getAttribute("data-zoom")),
  };
}

describe("useTreeGraphZoom", () => {
  beforeEach(() => {
    containerWidth = 500;
    containerHeight = 300;
    resizeCallback = null;

    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => containerWidth);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(() => containerHeight);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("ResizeObserver", class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe() {}
      disconnect() {}
      unobserve() {}
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fits the whole graph by both width and height when reset", async () => {
    render(<GraphZoomHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));

    await waitFor(() => expect(readGraphState().zoom).toBeCloseTo(0.13));
    expect(readGraphState().panX).toBeCloseTo(185);
    expect(readGraphState().panY).toBeCloseTo(20);

    fireEvent.click(screen.getByRole("button", { name: "Thu nhỏ" }));
    expect(readGraphState().zoom).toBeLessThan(0.13);
  });

  it("preserves the user's zoom and centered graph point when the container resizes", async () => {
    render(<GraphZoomHarness />);
    await waitFor(() => expect(readGraphState().zoom).toBeCloseTo(0.75));

    fireEvent.click(screen.getByRole("button", { name: "Phóng to" }));
    const beforeResize = readGraphState();
    expect(beforeResize.zoom).toBeCloseTo(0.9);

    containerWidth = 700;
    containerHeight = 500;
    act(() => {
      resizeCallback?.(
        [{ contentRect: { width: 700, height: 500 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    await waitFor(() => expect(readGraphState().zoom).toBeCloseTo(beforeResize.zoom));
    expect(readGraphState().panX).toBeCloseTo(beforeResize.panX + 100);
    expect(readGraphState().panY).toBeCloseTo(beforeResize.panY + 100);
  });
});
