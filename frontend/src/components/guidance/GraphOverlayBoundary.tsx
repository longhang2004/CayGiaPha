"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export interface GraphSafeRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface OverlayContextValue {
  root: HTMLElement | null;
  layer: HTMLElement | null;
  spotlightLayer: HTMLElement | null;
  safeRect: GraphSafeRect;
}

const EMPTY_RECT: GraphSafeRect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
const GraphOverlayContext = createContext<OverlayContextValue | null>(null);

interface BoundaryProps {
  className: string;
  children: ReactNode;
  overlay?: ReactNode;
}

export function GraphOverlayBoundary({ className, children, overlay }: BoundaryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const spotlightLayerRef = useRef<HTMLDivElement>(null);
  const [safeRect, setSafeRect] = useState(EMPTY_RECT);
  const [rootHeight, setRootHeight] = useState(0);
  const [portalReady, setPortalReady] = useState(false);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    setRootHeight(rootRect.height);
    const padding = 12;
    let left = padding;
    let top = padding;
    let right = rootRect.width - padding;
    let bottom = rootRect.height - padding;

    const exclusions = [
      ...Array.from(root.querySelectorAll<HTMLElement>("[data-graph-safe-exclude]")),
      ...Array.from(document.querySelectorAll<HTMLElement>("[data-graph-safe-external]")),
    ];
    exclusions.forEach((element) => {
      if (element.classList.contains("tree-workspace__info-panel") && !element.classList.contains("tree-workspace__info-panel--open")) return;
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") return;
      const rect = element.getBoundingClientRect();
      if (rect.right <= rootRect.left || rect.left >= rootRect.right || rect.bottom <= rootRect.top || rect.top >= rootRect.bottom) return;
      const side = element.dataset.graphSafeExclude ?? element.dataset.graphSafeExternal;
      if (side === "top") top = Math.max(top, rect.bottom - rootRect.top + padding);
      if (side === "bottom") bottom = Math.min(bottom, rect.top - rootRect.top - padding);
      if (side === "left") left = Math.max(left, rect.right - rootRect.left + padding);
      if (side === "right") right = Math.min(right, rect.left - rootRect.left - padding);
      if (side === "auto-y") {
        if (rect.top - rootRect.top < rootRect.height / 2) {
          top = Math.max(top, rect.bottom - rootRect.top + padding);
        } else {
          bottom = Math.min(bottom, rect.top - rootRect.top - padding);
        }
      }
      if (side === "panel") {
        if (rect.width > rootRect.width * 0.7) bottom = Math.min(bottom, rect.top - rootRect.top - padding);
        else right = Math.min(right, rect.left - rootRect.left - padding);
      }
    });

    if (right < left) right = left;
    if (bottom < top) bottom = top;
    setSafeRect({ left, top, right, bottom, width: right - left, height: bottom - top });
  }, []);

  useLayoutEffect(() => {
    setPortalReady(true);
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    const observeExclusions = () => {
      root.querySelectorAll<HTMLElement>("[data-graph-safe-exclude]").forEach((element) => observer.observe(element));
      document.querySelectorAll<HTMLElement>("[data-graph-safe-external]").forEach((element) => observer.observe(element));
    };
    observeExclusions();
    const mutation = new MutationObserver(() => {
      observeExclusions();
      measure();
    });
    mutation.observe(root, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["class", "style"],
    });
    window.addEventListener("resize", measure);
    const frame = window.requestAnimationFrame(measure);
    return () => {
      observer.disconnect();
      mutation.disconnect();
      window.removeEventListener("resize", measure);
      window.cancelAnimationFrame(frame);
    };
  }, [measure]);

  const value: OverlayContextValue = {
    root: rootRef.current,
    layer: layerRef.current,
    spotlightLayer: spotlightLayerRef.current,
    safeRect,
  };
  const layerStyle = {
    left: safeRect.left,
    top: safeRect.top,
    width: safeRect.width,
    height: safeRect.height,
  };
  const rootStyle = {
    "--graph-coach-bottom-inset": `${safeRect.bottom > 0
      ? Math.max(0, rootHeight - safeRect.bottom - 12)
      : 0}px`,
  } as CSSProperties;

  return (
    <GraphOverlayContext.Provider value={value}>
      <div ref={rootRef} className={className} style={rootStyle}>
        {children}
        <div
          ref={spotlightLayerRef}
          className="graph-spotlight-layer"
          data-testid="graph-spotlight-layer"
          aria-hidden="true"
        />
        <div ref={layerRef} className="graph-overlay-layer" style={layerStyle} data-testid="graph-overlay-layer" />
        {portalReady && layerRef.current && overlay ? createPortal(overlay, layerRef.current) : null}
      </div>
    </GraphOverlayContext.Provider>
  );
}

export function useGraphOverlay() {
  const context = useContext(GraphOverlayContext);
  if (!context) throw new Error("useGraphOverlay must be used within GraphOverlayBoundary");
  return context;
}
