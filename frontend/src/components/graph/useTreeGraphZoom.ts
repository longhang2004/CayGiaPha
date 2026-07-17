import { useCallback, useEffect, useRef, useState } from "react";
import {
  centerCameraOn,
  clampCamera,
  fitCamera,
  getCameraLimits,
  zoomCameraAt,
  type CameraGeometry,
  type CameraState,
} from "./treeGraphCamera";

export function useTreeGraphZoom(
  svgWidth: number,
  svgHeight: number,
  personsLength: number,
  positions: Map<string, { x: number; y: number }>,
  initialCenterId?: string | null,
) {
  const [camera, setCamera] = useState<CameraState>({
    pan: { x: 0, y: 0 },
    zoom: 1,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const pinchStartRef = useRef<{
    distance: number;
    camera: CameraState;
    midpoint: { x: number; y: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const initializedLayoutRef = useRef<string | null>(null);
  const containerSizeRef = useRef<{ width: number; height: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const initialPosition = initialCenterId ? positions.get(initialCenterId) : undefined;
  const initializationKey = [
    personsLength,
    positions.size,
    svgWidth,
    svgHeight,
    initialCenterId ?? "",
    initialPosition?.x ?? "",
    initialPosition?.y ?? "",
  ].join(":");

  const geometryFor = useCallback((width: number, height: number): CameraGeometry => ({
    viewport: { width, height },
    world: { width: svgWidth, height: svgHeight },
  }), [svgHeight, svgWidth]);

  const currentGeometry = useCallback(() => {
    const container = containerRef.current;
    const size = containerSizeRef.current ?? {
      width: container?.clientWidth ?? 0,
      height: container?.clientHeight ?? 0,
    };
    return geometryFor(size.width, size.height);
  }, [geometryFor]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!fullscreenRef.current) return;
    if (!document.fullscreenElement) {
      fullscreenRef.current.requestFullscreen().catch(() => {
        console.error("Error attempting to enable fullscreen.");
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  const handleReset = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0) return;
    containerSizeRef.current = { width, height };
    setCamera(fitCamera(geometryFor(width, height)));
  }, [geometryFor]);

  const handleReadableInitialView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return false;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width <= 0 || height <= 0 || svgWidth <= 0 || svgHeight <= 0) return false;

    const geometry = geometryFor(width, height);
    const fitted = fitCamera(geometry);
    containerSizeRef.current = { width, height };

    if (!initialPosition || fitted.zoom >= 0.75) {
      setCamera(fitted);
      return true;
    }

    setCamera(centerCameraOn(
      { zoom: 0.75, pan: { x: 0, y: 0 } },
      initialPosition,
      geometry,
    ));
    return true;
  }, [geometryFor, initialPosition, svgHeight, svgWidth]);

  useEffect(() => {
    if (initializedLayoutRef.current === initializationKey) return;
    if (handleReadableInitialView()) {
      initializedLayoutRef.current = initializationKey;
    }
  }, [handleReadableInitialView, initializationKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    let animationFrame = 0;
    const observer = new ResizeObserver((entries) => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(() => {
        const entry = entries[0];
        const nextWidth = entry?.contentRect.width || container.clientWidth;
        const nextHeight = entry?.contentRect.height || container.clientHeight;
        if (nextWidth <= 0 || nextHeight <= 0) return;

        const previousSize = containerSizeRef.current;
        containerSizeRef.current = { width: nextWidth, height: nextHeight };
        if (!previousSize || initializedLayoutRef.current !== initializationKey) {
          if (handleReadableInitialView()) {
            initializedLayoutRef.current = initializationKey;
          }
          return;
        }

        const previousGeometry = geometryFor(previousSize.width, previousSize.height);
        const nextGeometry = geometryFor(nextWidth, nextHeight);
        setCamera((current) => {
          const boundedCurrent = clampCamera(current, previousGeometry);
          const worldAtCenter = {
            x: (previousSize.width / 2 - boundedCurrent.pan.x) / boundedCurrent.zoom,
            y: (previousSize.height / 2 - boundedCurrent.pan.y) / boundedCurrent.zoom,
          };
          const nextLimits = getCameraLimits(nextGeometry, boundedCurrent.zoom);
          const nextZoom = Math.max(
            nextLimits.minZoom,
            Math.min(nextLimits.maxZoom, boundedCurrent.zoom),
          );
          return clampCamera({
            zoom: nextZoom,
            pan: {
              x: nextWidth / 2 - worldAtCenter.x * nextZoom,
              y: nextHeight / 2 - worldAtCenter.y * nextZoom,
            },
          }, nextGeometry);
        });
      });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [geometryFor, handleReadableInitialView, initializationKey]);

  const handleMouseDown = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const target = event.target as SVGElement;
    if (target.closest(".tree-graph__node-button") || target.closest("select") || target.closest("button")) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: event.clientX - camera.pan.x, y: event.clientY - camera.pan.y });
  }, [camera.pan.x, camera.pan.y]);

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setCamera((current) => clampCamera({
      zoom: current.zoom,
      pan: {
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y,
      },
    }, currentGeometry()));
  }, [currentGeometry, dragStart, isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const distanceBetweenTouches = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const midpointBetweenTouches = (touches: React.TouchList) => {
    const rect = containerRef.current?.getBoundingClientRect();
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2 - (rect?.left ?? 0),
      y: (touches[0].clientY + touches[1].clientY) / 2 - (rect?.top ?? 0),
    };
  };

  const handleTouchStart = useCallback((event: React.TouchEvent<SVGSVGElement>) => {
    const target = event.target as SVGElement;
    if (target.closest(".tree-graph__node-button") || target.closest("select") || target.closest("button")) {
      return;
    }

    if (event.touches.length === 2) {
      event.preventDefault();
      setIsDragging(false);
      pinchStartRef.current = {
        distance: distanceBetweenTouches(event.touches),
        camera,
        midpoint: midpointBetweenTouches(event.touches),
      };
      return;
    }

    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    pinchStartRef.current = null;
    setIsDragging(true);
    setDragStart({ x: touch.clientX - camera.pan.x, y: touch.clientY - camera.pan.y });
  }, [camera]);

  const handleTouchMove = useCallback((event: React.TouchEvent<SVGSVGElement>) => {
    if (event.touches.length === 2 && pinchStartRef.current) {
      event.preventDefault();
      const start = pinchStartRef.current;
      const nextDistance = distanceBetweenTouches(event.touches);
      if (start.distance <= 0 || nextDistance <= 0) return;

      const currentMidpoint = midpointBetweenTouches(event.touches);
      const requestedZoom = start.camera.zoom * (nextDistance / start.distance);
      const startWorldAnchor = {
        x: (start.midpoint.x - start.camera.pan.x) / start.camera.zoom,
        y: (start.midpoint.y - start.camera.pan.y) / start.camera.zoom,
      };
      const limits = getCameraLimits(currentGeometry(), requestedZoom);
      const zoom = Math.max(limits.minZoom, Math.min(limits.maxZoom, requestedZoom));
      setCamera(clampCamera({
        zoom,
        pan: {
          x: currentMidpoint.x - startWorldAnchor.x * zoom,
          y: currentMidpoint.y - startWorldAnchor.y * zoom,
        },
      }, currentGeometry()));
      return;
    }

    if (!isDragging || event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.touches[0];
    setCamera((current) => clampCamera({
      zoom: current.zoom,
      pan: {
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      },
    }, currentGeometry()));
  }, [currentGeometry, dragStart, isDragging]);

  const handleTouchEnd = useCallback(() => {
    pinchStartRef.current = null;
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    const anchor = {
      x: event.clientX - (rect?.left ?? 0),
      y: event.clientY - (rect?.top ?? 0),
    };
    const zoomFactor = 1.05;
    setCamera((current) => zoomCameraAt(
      current,
      event.deltaY < 0 ? current.zoom * zoomFactor : current.zoom / zoomFactor,
      anchor,
      currentGeometry(),
    ));
  }, [currentGeometry]);

  const zoomFromCenter = useCallback((factor: number) => {
    const geometry = currentGeometry();
    const anchor = {
      x: geometry.viewport.width / 2,
      y: geometry.viewport.height / 2,
    };
    setCamera((current) => zoomCameraAt(
      current,
      current.zoom * factor,
      anchor,
      geometry,
    ));
  }, [currentGeometry]);

  const handleZoomIn = useCallback(() => zoomFromCenter(1.2), [zoomFromCenter]);
  const handleZoomOut = useCallback(() => zoomFromCenter(1 / 1.2), [zoomFromCenter]);

  const handleCenterOnNode = useCallback((nodeId: string) => {
    const position = positions.get(nodeId);
    if (!position) return;
    setCamera((current) => centerCameraOn(current, position, currentGeometry()));
  }, [currentGeometry, positions]);

  const handleExportSVG = useCallback(() => {
    const svgElement = containerRef.current?.querySelector(".tree-graph__svg") as SVGSVGElement | null;
    if (!svgElement) return;

    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    const groupElement = clone.querySelector("g");
    if (groupElement) {
      groupElement.removeAttribute("transform");
    }

    let styles = "";
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules);
          for (const rule of rules) {
            if (rule.cssText.includes("tree-graph") || rule.cssText.includes("edge-")) {
              styles += rule.cssText + "\n";
            }
          }
        } catch {
        }
      }
    } catch {
    }

    if (styles) {
      const styleTag = document.createElementNS("http://www.w3.org/2000/svg", "style");
      styleTag.textContent = styles;
      clone.insertBefore(styleTag, clone.firstChild);
    }

    clone.setAttribute("width", svgWidth.toString());
    clone.setAttribute("height", svgHeight.toString());
    clone.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "gia-pha-dong-ho.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [svgHeight, svgWidth]);

  const limits = getCameraLimits(currentGeometry(), camera.zoom);
  const epsilon = 0.000001;

  return {
    pan: camera.pan,
    zoom: camera.zoom,
    minZoom: limits.minZoom,
    maxZoom: limits.maxZoom,
    canZoomIn: camera.zoom < limits.maxZoom - epsilon,
    canZoomOut: camera.zoom > limits.minZoom + epsilon,
    isDragging,
    isFullscreen,
    containerRef,
    fullscreenRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
    handleZoomIn,
    handleZoomOut,
    handleReset,
    handleCenterOnNode,
    handleToggleFullscreen,
    handleExportSVG,
  };
}
