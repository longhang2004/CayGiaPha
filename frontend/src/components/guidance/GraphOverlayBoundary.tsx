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

type Placement = "top" | "bottom" | "left" | "right";
interface OverlayContextValue {
  root: HTMLElement | null;
  layer: HTMLElement | null;
  safeRect: GraphSafeRect;
  getPlacement: (anchorId: string, preferred?: Placement) => { style: CSSProperties; target: HTMLElement | null; fallback: boolean };
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
  const [safeRect, setSafeRect] = useState(EMPTY_RECT);
  const [portalReady, setPortalReady] = useState(false);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
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
    root.querySelectorAll<HTMLElement>("[data-graph-safe-exclude]").forEach((element) => observer.observe(element));
    document.querySelectorAll<HTMLElement>("[data-graph-safe-external]").forEach((element) => observer.observe(element));
    const mutation = new MutationObserver(measure);
    mutation.observe(root, { attributes: true, subtree: true, attributeFilter: ["class", "style"] });
    window.addEventListener("resize", measure);
    const frame = window.requestAnimationFrame(measure);
    return () => {
      observer.disconnect();
      mutation.disconnect();
      window.removeEventListener("resize", measure);
      window.cancelAnimationFrame(frame);
    };
  }, [measure]);

  const getPlacement = useCallback<OverlayContextValue["getPlacement"]>((anchorId, preferred = "bottom") => {
    const root = rootRef.current;
    const layer = layerRef.current;
    const target = root?.querySelector<HTMLElement>(`[data-guidance-anchor="${anchorId}"]`) ?? null;
    if (!root || !layer || !target || safeRect.width === 0) return { style: {}, target, fallback: true };
    const layerRect = layer.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const cardWidth = Math.min(340, safeRect.width);
    const cardHeight = 280;
    const gap = 12;
    let x = targetRect.left - layerRect.left;
    let y = targetRect.bottom - layerRect.top + gap;
    if (preferred === "top") y = targetRect.top - layerRect.top - cardHeight - gap;
    if (preferred === "left") x = targetRect.left - layerRect.left - cardWidth - gap;
    if (preferred === "right") x = targetRect.right - layerRect.left + gap;
    x = Math.max(0, Math.min(x, safeRect.width - cardWidth));
    y = Math.max(0, Math.min(y, safeRect.height - cardHeight));
    return { style: { left: x, top: y, width: cardWidth, maxHeight: Math.max(120, safeRect.height - y), overflow: "auto" }, target, fallback: false };
  }, [safeRect]);

  const value: OverlayContextValue = { root: rootRef.current, layer: layerRef.current, safeRect, getPlacement };
  const layerStyle = {
    left: safeRect.left,
    top: safeRect.top,
    width: safeRect.width,
    height: safeRect.height,
  };

  return (
    <GraphOverlayContext.Provider value={value}>
      <div ref={rootRef} className={className}>
        {children}
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
