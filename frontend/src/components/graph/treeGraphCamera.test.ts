import { describe, expect, it } from "vitest";
import {
  centerCameraOn,
  clampCamera,
  fitCamera,
  getCameraLimits,
  zoomCameraAt,
  type CameraGeometry,
} from "./treeGraphCamera";

const geometry = (
  viewportWidth: number,
  viewportHeight: number,
  worldWidth: number,
  worldHeight: number,
): CameraGeometry => ({
  viewport: { width: viewportWidth, height: viewportHeight },
  world: { width: worldWidth, height: worldHeight },
});

describe("tree graph camera", () => {
  it("derives fit, dynamic minimum, and maximum zoom", () => {
    const limits = getCameraLimits(geometry(500, 300, 1000, 2000), 1);

    expect(limits.fitZoom).toBeCloseTo(0.102);
    expect(limits.minZoom).toBe(0.12);
    expect(limits.maxZoom).toBe(2);
  });

  it("caps the effective minimum at 0.5 for a small graph", () => {
    const limits = getCameraLimits(geometry(500, 300, 200, 100), 1);

    expect(limits.fitZoom).toBe(1);
    expect(limits.minZoom).toBe(0.5);
  });

  it("clamps pan at all four 48px boundaries", () => {
    const graph = geometry(500, 400, 1000, 800);

    expect(clampCamera({ zoom: 1, pan: { x: 1000, y: 1000 } }, graph)).toEqual({
      zoom: 1,
      pan: { x: 48, y: 48 },
    });
    expect(clampCamera({ zoom: 1, pan: { x: -1000, y: -1000 } }, graph)).toEqual({
      zoom: 1,
      pan: { x: -548, y: -448 },
    });
  });

  it("centers an axis whose scaled graph is smaller than the padded viewport", () => {
    expect(
      clampCamera(
        { zoom: 1, pan: { x: 40, y: -200 } },
        geometry(500, 300, 200, 100),
      ),
    ).toEqual({
      zoom: 1,
      pan: { x: 150, y: 100 },
    });
  });

  it("fits the world and centers the unconstrained axis", () => {
    const camera = fitCamera(geometry(800, 600, 1000, 500));

    expect(camera.zoom).toBeCloseTo(0.704);
    expect(camera.pan.x).toBeCloseTo(48);
    expect(camera.pan.y).toBeCloseTo(124);
  });

  it("uses the absolute floor when the raw fit would be unreadably small", () => {
    const camera = fitCamera(geometry(500, 300, 1000, 2000));

    expect(camera.zoom).toBe(0.12);
    expect(camera.pan).toEqual({ x: 190, y: 30 });
  });

  it("keeps the same world point under an unclamped zoom anchor", () => {
    const graph = geometry(800, 600, 2000, 2000);
    const before = { zoom: 1, pan: { x: -200, y: -300 } };
    const anchor = { x: 400, y: 300 };
    const worldBefore = {
      x: (anchor.x - before.pan.x) / before.zoom,
      y: (anchor.y - before.pan.y) / before.zoom,
    };

    const after = zoomCameraAt(before, 1.5, anchor, graph);
    const worldAfter = {
      x: (anchor.x - after.pan.x) / after.zoom,
      y: (anchor.y - after.pan.y) / after.zoom,
    };

    expect(after).toEqual({ zoom: 1.5, pan: { x: -500, y: -600 } });
    expect(worldAfter).toEqual(worldBefore);
  });

  it("clamps requested zoom before calculating the anchored pan", () => {
    const graph = geometry(800, 600, 2000, 2000);
    const after = zoomCameraAt(
      { zoom: 1, pan: { x: -200, y: -300 } },
      4,
      { x: 400, y: 300 },
      graph,
    );

    expect(after.zoom).toBe(2);
  });

  it("centers a requested world point at the current zoom, then applies boundaries", () => {
    const graph = geometry(800, 600, 2000, 1600);

    expect(
      centerCameraOn(
        { zoom: 1, pan: { x: 0, y: 0 } },
        { x: 1000, y: 800 },
        graph,
      ),
    ).toEqual({
      zoom: 1,
      pan: { x: -600, y: -500 },
    });
  });
});
