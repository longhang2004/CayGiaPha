import { useState, useRef, useEffect, useCallback } from "react";

export function useTreeGraphZoom(
  svgWidth: number,
  svgHeight: number,
  personsLength: number,
  positions: Map<string, { x: number; y: number }>
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
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      const paddingX = 40;
      const calculatedZoom = Math.min(1, (containerWidth - paddingX) / svgWidth);
      const initialPanX = (containerWidth - svgWidth * calculatedZoom) / 2;
      const initialPanY = Math.max(20, (containerHeight - svgHeight * calculatedZoom) / 2);
      setPan({ x: initialPanX, y: initialPanY });
      setZoom(calculatedZoom);
    }
  }, [svgWidth, svgHeight]);

  useEffect(() => {
    handleReset();
  }, [handleReset, personsLength]);

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

  const clampZoom = (value: number) => Math.max(0.3, Math.min(3, value));

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

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(3, z * 1.2)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(0.3, z / 1.2)), []);

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
