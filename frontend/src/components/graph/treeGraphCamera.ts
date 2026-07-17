import type { GraphPoint, GraphSize } from "./treeGraphGeometry";

export interface CameraGeometry {
  viewport: GraphSize;
  world: GraphSize;
}

export interface CameraState {
  zoom: number;
  pan: GraphPoint;
}

export interface CameraPanBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CameraLimits {
  fitZoom: number;
  minZoom: number;
  maxZoom: number;
  pan: CameraPanBounds;
}

export const CAMERA_EDGE_PADDING = 48;
export const CAMERA_MIN_ZOOM_FLOOR = 0.12;
export const CAMERA_MIN_ZOOM_CEILING = 0.5;
export const CAMERA_MAX_ZOOM = 2;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function fitZoomFor({ viewport, world }: CameraGeometry) {
  if (viewport.width <= 0 || viewport.height <= 0 || world.width <= 0 || world.height <= 0) {
    return 1;
  }

  const availableWidth = Math.max(1, viewport.width - CAMERA_EDGE_PADDING * 2);
  const availableHeight = Math.max(1, viewport.height - CAMERA_EDGE_PADDING * 2);
  return Math.min(1, availableWidth / world.width, availableHeight / world.height);
}

function axisBounds(viewportSize: number, worldSize: number, zoom: number) {
  const scaledWorld = worldSize * zoom;
  const paddedViewport = Math.max(0, viewportSize - CAMERA_EDGE_PADDING * 2);
  if (scaledWorld <= paddedViewport) {
    const centered = (viewportSize - scaledWorld) / 2;
    return { min: centered, max: centered };
  }

  return {
    min: viewportSize - CAMERA_EDGE_PADDING - scaledWorld,
    max: CAMERA_EDGE_PADDING,
  };
}

export function getCameraLimits(geometry: CameraGeometry, zoom: number): CameraLimits {
  const fitZoom = fitZoomFor(geometry);
  const minZoom = clamp(
    fitZoom,
    CAMERA_MIN_ZOOM_FLOOR,
    CAMERA_MIN_ZOOM_CEILING,
  );
  const boundedZoom = clamp(zoom, minZoom, CAMERA_MAX_ZOOM);
  const horizontal = axisBounds(geometry.viewport.width, geometry.world.width, boundedZoom);
  const vertical = axisBounds(geometry.viewport.height, geometry.world.height, boundedZoom);

  return {
    fitZoom,
    minZoom,
    maxZoom: CAMERA_MAX_ZOOM,
    pan: {
      minX: horizontal.min,
      maxX: horizontal.max,
      minY: vertical.min,
      maxY: vertical.max,
    },
  };
}

export function clampCamera(state: CameraState, geometry: CameraGeometry): CameraState {
  const initialLimits = getCameraLimits(geometry, state.zoom);
  const zoom = clamp(state.zoom, initialLimits.minZoom, initialLimits.maxZoom);
  const limits = getCameraLimits(geometry, zoom);

  return {
    zoom,
    pan: {
      x: clamp(state.pan.x, limits.pan.minX, limits.pan.maxX),
      y: clamp(state.pan.y, limits.pan.minY, limits.pan.maxY),
    },
  };
}

export function fitCamera(geometry: CameraGeometry): CameraState {
  const limits = getCameraLimits(geometry, 1);
  const zoom = clamp(limits.fitZoom, limits.minZoom, limits.maxZoom);
  return clampCamera({
    zoom,
    pan: {
      x: (geometry.viewport.width - geometry.world.width * zoom) / 2,
      y: (geometry.viewport.height - geometry.world.height * zoom) / 2,
    },
  }, geometry);
}

export function zoomCameraAt(
  state: CameraState,
  requestedZoom: number,
  anchor: GraphPoint,
  geometry: CameraGeometry,
): CameraState {
  const current = clampCamera(state, geometry);
  const limits = getCameraLimits(geometry, requestedZoom);
  const zoom = clamp(requestedZoom, limits.minZoom, limits.maxZoom);
  const worldAnchor = {
    x: (anchor.x - current.pan.x) / current.zoom,
    y: (anchor.y - current.pan.y) / current.zoom,
  };

  return clampCamera({
    zoom,
    pan: {
      x: anchor.x - worldAnchor.x * zoom,
      y: anchor.y - worldAnchor.y * zoom,
    },
  }, geometry);
}

export function centerCameraOn(
  state: CameraState,
  worldPoint: GraphPoint,
  geometry: CameraGeometry,
): CameraState {
  const current = clampCamera(state, geometry);
  return clampCamera({
    zoom: current.zoom,
    pan: {
      x: geometry.viewport.width / 2 - worldPoint.x * current.zoom,
      y: geometry.viewport.height / 2 - worldPoint.y * current.zoom,
    },
  }, geometry);
}
