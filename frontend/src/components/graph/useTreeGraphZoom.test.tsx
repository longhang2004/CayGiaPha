import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTreeGraphZoom } from "./useTreeGraphZoom";

let containerWidth = 800;
let containerHeight = 600;
let resizeCallback: ResizeObserverCallback | null = null;

const positions = new Map([
  ["ego", { x: 1000, y: 1000 }],
  ["target", { x: 1900, y: 1900 }],
]);

function GraphZoomHarness({
  svgWidth = 2000,
  svgHeight = 2000,
}: {
  svgWidth?: number;
  svgHeight?: number;
}) {
  const graph = useTreeGraphZoom(
    svgWidth,
    svgHeight,
    2,
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
        data-min-zoom={graph.minZoom}
        data-max-zoom={graph.maxZoom}
      />
      <svg
        data-testid="graph-canvas"
        onMouseDown={graph.handleMouseDown}
        onMouseMove={graph.handleMouseMove}
        onMouseUp={graph.handleMouseUp}
        onTouchStart={graph.handleTouchStart}
        onTouchMove={graph.handleTouchMove}
        onTouchEnd={graph.handleTouchEnd}
        onWheel={graph.handleWheel}
      />
      <button type="button" onClick={graph.handleZoomIn} disabled={!graph.canZoomIn}>Phóng to</button>
      <button type="button" onClick={graph.handleZoomOut} disabled={!graph.canZoomOut}>Thu nhỏ</button>
      <button type="button" onClick={graph.handleReset}>Đặt lại</button>
      <button type="button" onClick={() => graph.handleCenterOnNode("target")}>Căn giữa target</button>
    </div>
  );
}

function readGraphState() {
  const state = screen.getByTestId("graph-state");
  return {
    panX: Number(state.getAttribute("data-pan-x")),
    panY: Number(state.getAttribute("data-pan-y")),
    zoom: Number(state.getAttribute("data-zoom")),
    minZoom: Number(state.getAttribute("data-min-zoom")),
    maxZoom: Number(state.getAttribute("data-max-zoom")),
  };
}

describe("useTreeGraphZoom", () => {
  beforeEach(() => {
    containerWidth = 800;
    containerHeight = 600;
    resizeCallback = null;

    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => containerWidth);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(() => containerHeight);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: containerWidth,
      bottom: containerHeight,
      width: containerWidth,
      height: containerHeight,
      toJSON: () => ({}),
    }));
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

  it("uses a readable initial view and exposes camera limits", async () => {
    render(<GraphZoomHarness />);

    await waitFor(() => expect(readGraphState().zoom).toBeCloseTo(0.75));
    expect(readGraphState()).toEqual({
      panX: -350,
      panY: -450,
      zoom: 0.75,
      minZoom: 0.252,
      maxZoom: 2,
    });
    expect(screen.getByRole("button", { name: "Phóng to" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Thu nhỏ" })).toBeEnabled();
  });

  it("fits on reset and prevents zooming below the effective minimum", async () => {
    containerWidth = 500;
    containerHeight = 300;
    render(<GraphZoomHarness svgWidth={1000} svgHeight={2000} />);

    fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));

    await waitFor(() => expect(readGraphState().zoom).toBeCloseTo(0.12));
    expect(readGraphState().panX).toBeCloseTo(190);
    expect(readGraphState().panY).toBeCloseTo(30);
    expect(screen.getByRole("button", { name: "Thu nhỏ" })).toBeDisabled();
  });

  it("clamps mouse dragging at all camera boundaries", async () => {
    containerWidth = 500;
    containerHeight = 400;
    render(<GraphZoomHarness svgWidth={1000} svgHeight={800} />);
    await waitFor(() => expect(readGraphState().zoom).toBeCloseTo(0.75));
    const canvas = screen.getByTestId("graph-canvas");

    fireEvent.mouseDown(canvas, { button: 0, clientX: 250, clientY: 200 });
    fireEvent.mouseMove(canvas, { clientX: 5000, clientY: 5000 });
    expect(readGraphState().panX).toBe(48);
    expect(readGraphState().panY).toBe(48);

    fireEvent.mouseMove(canvas, { clientX: -5000, clientY: -5000 });
    expect(readGraphState().panX).toBe(-298);
    expect(readGraphState().panY).toBe(-248);
  });

  it("zooms around the wheel pointer", async () => {
    render(<GraphZoomHarness />);
    await waitFor(() => expect(readGraphState().zoom).toBeCloseTo(0.75));

    fireEvent.wheel(screen.getByTestId("graph-canvas"), {
      clientX: 400,
      clientY: 300,
      deltaY: -100,
    });

    expect(readGraphState().zoom).toBeCloseTo(0.7875);
    expect(readGraphState().panX).toBeCloseTo(-387.5);
    expect(readGraphState().panY).toBeCloseTo(-487.5);
  });

  it("zooms around the pinch midpoint", async () => {
    render(<GraphZoomHarness />);
    await waitFor(() => expect(readGraphState().zoom).toBeCloseTo(0.75));
    const canvas = screen.getByTestId("graph-canvas");

    fireEvent.touchStart(canvas, {
      touches: [
        { clientX: 300, clientY: 300 },
        { clientX: 500, clientY: 300 },
      ],
    });
    fireEvent.touchMove(canvas, {
      touches: [
        { clientX: 0, clientY: 300 },
        { clientX: 800, clientY: 300 },
      ],
    });

    expect(readGraphState().zoom).toBe(2);
    expect(readGraphState().panX).toBeCloseTo(-1600);
    expect(readGraphState().panY).toBeCloseTo(-1700);
  });

  it("preserves the centered graph point on resize when boundaries allow it", async () => {
    render(<GraphZoomHarness />);
    await waitFor(() => expect(readGraphState().zoom).toBeCloseTo(0.75));

    fireEvent.click(screen.getByRole("button", { name: "Phóng to" }));
    const beforeResize = readGraphState();
    expect(beforeResize.zoom).toBeCloseTo(0.9);

    containerWidth = 1000;
    containerHeight = 800;
    act(() => {
      resizeCallback?.(
        [{ contentRect: { width: 1000, height: 800 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    await waitFor(() => expect(readGraphState().zoom).toBeCloseTo(beforeResize.zoom));
    expect(readGraphState().panX).toBeCloseTo(beforeResize.panX + 100);
    expect(readGraphState().panY).toBeCloseTo(beforeResize.panY + 100);
  });

  it("centers a requested node and clamps it near the world edge", async () => {
    render(<GraphZoomHarness />);
    await waitFor(() => expect(readGraphState().zoom).toBeCloseTo(0.75));

    fireEvent.click(screen.getByRole("button", { name: "Căn giữa target" }));

    expect(readGraphState().panX).toBe(-748);
    expect(readGraphState().panY).toBe(-948);
  });
});
