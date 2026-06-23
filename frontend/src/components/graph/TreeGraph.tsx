"use client";

/**
 * Tree/graph renderer (task 10.2).
 *
 * Responsibilities:
 *  - Draw person nodes and relationship edges using THREE visually distinct
 *    edge styles: solid (derived/verified), dashed (asserted/conflict), and a
 *    third distinct style for non-bloodline edges (Requirements 5.3, 6.3,
 *    12.4, 15.6).
 *  - Show person info plus the computed Form_Of_Address on selection
 *    (Requirement 8.1).
 *  - Provide a viewpoint selector that, on change, re-fetches the all-addresses
 *    result for the new ego and re-renders every node's address
 *    (Requirements 10.1, 10.2). Unresolved targets get an unresolved marker.
 *
 * NOTE on relationships: there is not yet a list-relationships endpoint, so the
 * renderer takes `persons` and `relationships` as props (client state). The
 * viewpoint addresses ARE fetched live from the backend.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addressLabel,
  fetchViewpointAddresses,
  indexAddresses,
  isUnresolved,
  layoutNodes,
  type Address,
  type Person,
  type Relationship,
  type ViewpointAddresses,
} from "@/lib/graph";
import { GraphEdge } from "./EdgeStyles";
import { ViewpointSelector } from "./ViewpointSelector";

export interface TreeGraphProps {
  treeId: string;
  persons: Person[];
  relationships: Relationship[];
  /** Initial viewpoint; defaults to the first person. */
  initialEgoId?: string;
  /**
   * Injectable fetcher (defaults to the real backend call). Tests provide a
   * stub so the viewpoint-switch behaviour can be asserted without a network.
   */
  fetchAddresses?: (
    treeId: string,
    egoId: string,
    signal?: AbortSignal,
  ) => Promise<ViewpointAddresses>;
  selectedId?: string | null;
  onSelectId?: (id: string | null) => void;
  onSelectAddress?: (address: Address | undefined) => void;
  onSelectEgo?: (ego: Person | null) => void;
  egoId?: string;
  onEgoChange?: (id: string) => void;
  onAddressLoading?: (loading: boolean) => void;
  hideViewpointSelector?: boolean;
  onAddressesLoaded?: (addresses: Map<string, Address>) => void;
}

const NODE_WIDTH = 160;
const NODE_HEIGHT = 56;

export function TreeGraph({
  treeId,
  persons,
  relationships,
  initialEgoId,
  fetchAddresses = fetchViewpointAddresses,
  selectedId,
  onSelectId,
  onSelectAddress,
  onSelectEgo,
  egoId,
  onEgoChange,
  onAddressLoading,
  hideViewpointSelector = false,
  onAddressesLoaded,
}: TreeGraphProps) {
  const firstId = persons[0]?.id ?? "";
  const [internalEgoId, setInternalEgoId] = useState<string>(initialEgoId ?? firstId);
  const activeEgoId = egoId !== undefined ? egoId : internalEgoId;
  const activeSetEgoId = onEgoChange ?? setInternalEgoId;

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const activeSelectedId = selectedId !== undefined ? selectedId : internalSelectedId;
  const activeSetSelectedId = onSelectId ?? setInternalSelectedId;
  const [addresses, setAddresses] = useState<Map<string, Address>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notify parent of address loading state changes
  useEffect(() => {
    onAddressLoading?.(loading);
  }, [loading, onAddressLoading]);

  const personById = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of persons) {
      map.set(p.id, p);
    }
    return map;
  }, [persons]);

  const positions = useMemo(
    () => layoutNodes(persons, relationships, { cellWidth: 220, cellHeight: 130, padding: 100 }),
    [persons, relationships]
  );

  // Re-fetch every node's address whenever the viewpoint (ego) changes
  // (Requirements 10.1, 10.2).
  const requestRef = useRef(0);
  useEffect(() => {
    if (!activeEgoId) {
      setAddresses(new Map());
      onAddressesLoaded?.(new Map());
      return;
    }
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchAddresses(treeId, activeEgoId, controller.signal)
      .then((result) => {
        // Ignore stale responses from superseded viewpoint changes.
        if (requestId !== requestRef.current) {
          return;
        }
        const indexed = indexAddresses(result);
        setAddresses(indexed);
        onAddressesLoaded?.(indexed);
      })
      .catch((err: unknown) => {
        if (requestId !== requestRef.current) {
          return;
        }
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setError("Không tải được cách xưng hô cho góc nhìn này.");
        setAddresses(new Map());
        onAddressesLoaded?.(new Map());
      })
      .finally(() => {
        if (requestId === requestRef.current) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [treeId, activeEgoId, fetchAddresses, onAddressesLoaded]);

  useEffect(() => {
    onSelectAddress?.(activeSelectedId ? addresses.get(activeSelectedId) : undefined);
  }, [addresses, activeSelectedId, onSelectAddress]);

  const ego = activeEgoId ? personById.get(activeEgoId) ?? null : null;

  useEffect(() => {
    onSelectEgo?.(ego);
  }, [ego, onSelectEgo]);

  const handleSelectViewpoint = useCallback((nextEgoId: string) => {
    activeSetEgoId(nextEgoId);
  }, [activeSetEgoId]);

  const selected = activeSelectedId ? personById.get(activeSelectedId) ?? null : null;

  const svgWidth = useMemo(() => {
    let max = 0;
    positions.forEach((p) => {
      max = Math.max(max, p.x);
    });
    return max + NODE_WIDTH + 100;
  }, [positions]);

  const svgHeight = useMemo(() => {
    let max = 0;
    positions.forEach((p) => {
      max = Math.max(max, p.y);
    });
    return max + NODE_HEIGHT + 100;
  }, [positions]);

  // Pan and Zoom logic
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Center the tree initially and on size changes
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const initialPanX = Math.max(20, (containerWidth - svgWidth) / 2);
      const initialPanY = Math.max(20, (containerHeight - svgHeight) / 2);
      setPan({ x: initialPanX, y: initialPanY });
      setZoom(1);
    }
  }, [svgWidth, svgHeight, persons.length]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    const target = e.target as SVGElement;
    if (target.closest(".tree-graph__node-button") || target.closest("select") || target.closest("button")) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const target = e.target as SVGElement;
    if (target.closest(".tree-graph__node-button") || target.closest("select") || target.closest("button")) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 1.05;
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    setZoom(Math.max(0.3, Math.min(3, nextZoom)));
  };

  const handleZoomIn = () => setZoom((z) => Math.min(3, z * 1.2));
  const handleZoomOut = () => setZoom((z) => Math.max(0.3, z / 1.2));
  const handleReset = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      setPan({
        x: Math.max(20, (containerWidth - svgWidth) / 2),
        y: Math.max(20, (containerHeight - svgHeight) / 2),
      });
      setZoom(1);
    }
  };

  return (
    <div className="tree-graph">
      <div className="tree-graph__controls">
        {!hideViewpointSelector && (
          <ViewpointSelector
            persons={persons}
            egoId={activeEgoId}
            onChange={handleSelectViewpoint}
            disabled={loading}
          />
        )}
        <p role="status" aria-live="polite" className="tree-graph__status">
          {loading ? "Đang tính cách xưng hô…" : error ?? ""}
        </p>
      </div>

      <div
        ref={containerRef}
        className="tree-graph__canvas"
        style={{
          position: "relative",
          width: "100%",
          height: "550px",
          overflow: "hidden",
          touchAction: "none",
        }}
      >
        <svg
          width="100%"
          height="100%"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          onWheel={handleWheel}
          role="group"
          aria-label="Sơ đồ gia phả"
          className="tree-graph__svg"
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            <g className="tree-graph__edges">
              {relationships.map((rel) => {
                const source = positions.get(rel.sourceId);
                const target = positions.get(rel.targetId);
                if (!source || !target) {
                  return null;
                }
                return (
                  <GraphEdge
                    key={rel.id}
                    relationship={rel}
                    source={source}
                    target={target}
                  />
                );
              })}
            </g>

            <g className="tree-graph__nodes">
              {persons.map((person) => {
                const pos = positions.get(person.id);
                if (!pos) {
                  return null;
                }
                const address = addresses.get(person.id);
                const isEgo = person.id === activeEgoId;
                const isSelected = person.id === activeSelectedId;
                const label = isEgo ? "Bản thân" : addressLabel(address);
                const unresolved = !isEgo && isUnresolved(address);

                return (
                  <g
                    key={person.id}
                    className={`tree-graph__node ${loading ? "tree-graph__node--loading" : ""}`}
                    data-person-id={person.id}
                    data-ego={isEgo ? "true" : "false"}
                    data-selected={isSelected ? "true" : "false"}
                    transform={`translate(${pos.x - NODE_WIDTH / 2}, ${pos.y - NODE_HEIGHT / 2})`}
                  >
                    <foreignObject width={NODE_WIDTH} height={NODE_HEIGHT}>
                      <button
                        type="button"
                        className="tree-graph__node-button"
                        aria-pressed={isSelected}
                        onClick={() => activeSetSelectedId(person.id)}
                      >
                        <span className="tree-graph__node-name">{person.displayName}</span>
                        <span
                          className="tree-graph__node-address"
                          data-address
                          data-unresolved={unresolved ? "true" : "false"}
                        >
                          {label}
                        </span>
                      </button>
                    </foreignObject>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Floating Zoom & Pan Controls */}
        <div
          className="tree-graph__nav-controls"
          style={{
            position: "absolute",
            bottom: "1rem",
            right: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            zIndex: 10,
          }}
        >
          <button
            type="button"
            onClick={handleZoomIn}
            className="btn btn-secondary"
            style={{
              minWidth: "40px",
              minHeight: "40px",
              padding: 0,
              fontSize: "1.25rem",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
            title="Phóng to"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="btn btn-secondary"
            style={{
              minWidth: "40px",
              minHeight: "40px",
              padding: 0,
              fontSize: "1.25rem",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
            title="Thu nhỏ"
          >
            −
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-secondary"
            style={{
              minWidth: "40px",
              minHeight: "40px",
              padding: 0,
              fontSize: "1rem",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
            title="Đặt lại góc nhìn"
          >
            🔍
          </button>
        </div>
      </div>
    </div>
  );
}
