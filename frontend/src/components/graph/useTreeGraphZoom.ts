import { useState, useRef, useEffect, useCallback } from "react";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 3;

export function useTreeGraphZoom(
  svgWidth: number,
  svgHeight: number,
  personsLength: number,
  positions: Map<string, { x: number; y: number }>,
  initialCenterId?: string | null,
) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const pinchStartRef = useRef<{
    distance: number;
    zoom: number;
    pan: { x: number; y: number };
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

  const calculateFitZoom = useCallback((containerWidth: number, containerHeight: number) => {
    if (containerWidth <= 0 || containerHeight <= 0 || svgWidth <= 0 || svgHeight <= 0) {
      return null;
    }

    const horizontalFit = (containerWidth - 40) / svgWidth;
    const verticalFit = (containerHeight - 40) / svgHeight;
    return Math.max(MIN_ZOOM, Math.min(1, horizontalFit, verticalFit));
  }, [svgHeight, svgWidth]);

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
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const calculatedZoom = calculateFitZoom(containerWidth, containerHeight);
      if (calculatedZoom === null) return;
      const initialPanX = (containerWidth - svgWidth * calculatedZoom) / 2;
      const initialPanY = (containerHeight - svgHeight * calculatedZoom) / 2;
      setPan({ x: initialPanX, y: initialPanY });
      setZoom(calculatedZoom);
    }
  }, [calculateFitZoom, svgWidth, svgHeight]);

  const handleReadableInitialView = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const fitZoom = calculateFitZoom(containerWidth, containerHeight);
    if (fitZoom === null) return false;
    containerSizeRef.current = { width: containerWidth, height: containerHeight };

    if (!initialPosition || fitZoom >= 0.75) {
      const initialPanX = (containerWidth - svgWidth * fitZoom) / 2;
      const initialPanY = (containerHeight - svgHeight * fitZoom) / 2;
      setPan({ x: initialPanX, y: initialPanY });
      setZoom(fitZoom);
      return true;
    }

    const readableZoom = 0.75;
    setZoom(readableZoom);
    setPan({
      x: containerWidth / 2 - initialPosition.x * readableZoom,
      y: containerHeight / 2 - initialPosition.y * readableZoom,
    });
    return true;
  }, [calculateFitZoom, initialPosition, svgHeight, svgWidth]);

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

        const deltaX = (nextWidth - previousSize.width) / 2;
        const deltaY = (nextHeight - previousSize.height) / 2;
        if (deltaX !== 0 || deltaY !== 0) {
          setPan((currentPan) => ({
            x: currentPan.x + deltaX,
            y: currentPan.y + deltaY,
          }));
        }
      });
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [handleReadableInitialView, initializationKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const target = e.target as SVGElement;
    if (target.closest(".tree-graph__node-button") || target.closest("select") || target.closest("button")) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan.x, pan.y]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const distanceBetweenTouches = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const midpointBetweenTouches = (touches: React.TouchList) => ({
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  });

  const clampZoom = (value: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));

  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (target.closest(".tree-graph__node-button") || target.closest("select") || target.closest("button")) {
      return;
    }

    if (e.touches.length === 2) {
      e.preventDefault();
      setIsDragging(false);
      pinchStartRef.current = {
        distance: distanceBetweenTouches(e.touches),
        zoom,
        pan,
        midpoint: midpointBetweenTouches(e.touches),
      };
      return;
    }

    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    pinchStartRef.current = null;
    setIsDragging(true);
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  }, [zoom, pan]);

  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2 && pinchStartRef.current) {
      e.preventDefault();
      const start = pinchStartRef.current;
      const nextDistance = distanceBetweenTouches(e.touches);
      if (start.distance <= 0 || nextDistance <= 0) return;

      const nextZoom = clampZoom(start.zoom * (nextDistance / start.distance));
      const currentMidpoint = midpointBetweenTouches(e.touches);
      const anchor = {
        x: (start.midpoint.x - start.pan.x) / start.zoom,
        y: (start.midpoint.y - start.pan.y) / start.zoom,
      };

      setZoom(nextZoom);
      setPan({
        x: currentMidpoint.x - anchor.x * nextZoom,
        y: currentMidpoint.y - anchor.y * nextZoom,
      });
      return;
    }

    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    pinchStartRef.current = null;
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 1.05;
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    setZoom(clampZoom(nextZoom));
  }, [zoom]);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.2)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.2)), []);

  const handleCenterOnNode = useCallback((nodeId: string) => {
    const pos = positions.get(nodeId);
    if (pos && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      setPan({
        x: containerWidth / 2 - pos.x * zoom,
        y: containerHeight / 2 - pos.y * zoom,
      });
    }
  }, [positions, zoom]);

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
        } catch (e) {
        }
      }
    } catch (e) {
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
    link.download = `gia-pha-dong-ho.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [svgWidth, svgHeight]);

  return {
    pan,
    zoom,
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
