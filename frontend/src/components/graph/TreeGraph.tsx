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
  capitalize,
  fetchViewpointAddresses,
  indexAddresses,
  isUnresolved,
  layoutNodes,
  edgeStyleFor,
  EDGE_CLASS,
  STROKE_DASHARRAY,
  type Address,
  type Person,
  type Relationship,
  type ViewpointAddresses,
} from "@/lib/graph";
import { GraphEdge } from "./EdgeStyles";
import { ViewpointSelector } from "./ViewpointSelector";
import { SearchIcon, DownloadIcon, MaximizeIcon, MinimizeIcon } from "@/components/ui/Icons";

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
  /**
   * Increment this value to force address re-fetch without changing egoId.
   * Used by tree/page.tsx after a region change so kinship terms update
   * immediately without a full tree reload.
   */
  addressRefreshKey?: number;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 72;

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
  addressRefreshKey = 0,
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

  // Focus Branch State
  const [focusId, setFocusId] = useState<string | null>(null);

  // Notify parent of address loading state changes
  useEffect(() => {
    onAddressLoading?.(loading);
  }, [loading, onAddressLoading]);

  // Reset focusId if it's no longer in the list of persons
  useEffect(() => {
    if (focusId && !persons.some((p) => p.id === focusId)) {
      setFocusId(null);
    }
  }, [persons, focusId]);

  const personById = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of persons) {
      map.set(p.id, p);
    }
    return map;
  }, [persons]);

  // Branch focus filtering logic: keeps the focused person, their descendants, and descendants' spouses
  const filteredData = useMemo(() => {
    if (!focusId) {
      return { persons, relationships };
    }

    const descendantIds = new Set<string>();
    descendantIds.add(focusId);

    const childrenOf = new Map<string, string[]>();
    relationships.forEach((r) => {
      if (r.type === "bloodline_father" || r.type === "bloodline_mother") {
        if (!childrenOf.has(r.sourceId)) childrenOf.set(r.sourceId, []);
        childrenOf.get(r.sourceId)!.push(r.targetId);
      }
    });

    const queue = [focusId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childrenOf.get(current) || [];
      children.forEach((childId) => {
        if (!descendantIds.has(childId)) {
          descendantIds.add(childId);
          queue.push(childId);
        }
      });
    }

    const spouseIds = new Set<string>();
    relationships.forEach((r) => {
      if (r.type === "marriage") {
        if (descendantIds.has(r.sourceId)) {
          spouseIds.add(r.targetId);
        } else if (descendantIds.has(r.targetId)) {
          spouseIds.add(r.sourceId);
        }
      }
    });

    const keepIds = new Set([...descendantIds, ...spouseIds]);

    const filteredPersons = persons.filter((p) => keepIds.has(p.id));
    const filteredRels = relationships.filter(
      (r) => keepIds.has(r.sourceId) && keepIds.has(r.targetId)
    );

    return { persons: filteredPersons, relationships: filteredRels };
  }, [persons, relationships, focusId]);

  const positions = useMemo(
    () => layoutNodes(filteredData.persons, filteredData.relationships, { cellWidth: 220, cellHeight: 130, padding: 100 }),
    [filteredData.persons, filteredData.relationships]
  );

  // Group parent-child relationships for joint rendering
  const { jointEdges, processedRelIds } = useMemo(() => {
    const jointEdgesList: {
      key: string;
      pathData: string;
      className: string;
      style: string;
      strokeDash: string;
      childId: string;
    }[] = [];
    const processedIds = new Set<string>();

    // Map children to their parent-child relationships
    const childParentsMap = new Map<string, Relationship[]>();
    filteredData.relationships.forEach((rel) => {
      if (rel.type === "bloodline_father" || rel.type === "bloodline_mother") {
        if (!childParentsMap.has(rel.targetId)) {
          childParentsMap.set(rel.targetId, []);
        }
        childParentsMap.get(rel.targetId)!.push(rel);
      }
    });

    childParentsMap.forEach((parentRels, childId) => {
      const parent1Rel = parentRels[0];
      const parent2Rel = parentRels[1];

      let fatherId: string | undefined;
      let motherId: string | undefined;

      if (parent2Rel) {
        fatherId = parent1Rel.sourceId;
        motherId = parent2Rel.sourceId;
      } else {
        const marriageRel = filteredData.relationships.find(
          (r) =>
            r.type === "marriage" &&
            (r.sourceId === parent1Rel.sourceId || r.targetId === parent1Rel.sourceId)
        );
        if (marriageRel) {
          fatherId = marriageRel.sourceId;
          motherId = marriageRel.targetId;
        }
      }

      if (fatherId && motherId) {
        const fatherPos = positions.get(fatherId);
        const motherPos = positions.get(motherId);
        const childPos = positions.get(childId);

        if (fatherPos && motherPos && childPos) {
          // Mark all parent relationships for this child as processed
          parentRels.forEach((r) => processedIds.add(r.id));

          const midParentX = (fatherPos.x + motherPos.x) / 2;
          const parentY = (fatherPos.y + motherPos.y) / 2;
          const midY = (parentY + childPos.y) / 2;

          const isDashed = parentRels.some((r) => edgeStyleFor(r) === "dashed");
          const style = isDashed ? "dashed" : "solid";
          const strokeDash = STROKE_DASHARRAY[style];
          const className = EDGE_CLASS[style];

          const NODE_HEIGHT = 72;
          const HALF_HEIGHT = NODE_HEIGHT / 2;

          const pathData = `M ${midParentX} ${parentY} L ${midParentX} ${midY} L ${childPos.x} ${midY} L ${childPos.x} ${childPos.y - HALF_HEIGHT}`;

          jointEdgesList.push({
            key: `joint-${childId}`,
            pathData,
            className,
            style,
            strokeDash,
            childId,
          });
        }
      }
    });

    return { jointEdges: jointEdgesList, processedRelIds: processedIds };
  }, [filteredData.relationships, positions]);

  const treeStructureVersion = useMemo(() => {
    const personParts = persons
      .map((p) => `${p.id}:${p.gender ?? ""}:${p.birthOrder ?? ""}:${p.birthYear ?? ""}`)
      .sort()
      .join("|");
    const relParts = relationships
      .map((r) => `${r.id}:${r.type}:${r.sourceId}:${r.targetId}:${r.derivationState}:${r.assertedLabel ?? ""}`)
      .sort()
      .join("|");
    return `${personParts}#${relParts}`;
  }, [persons, relationships]);

  // Re-fetch every node's address whenever the viewpoint (ego) changes
  const onAddressesLoadedRef = useRef(onAddressesLoaded);
  useEffect(() => {
    onAddressesLoadedRef.current = onAddressesLoaded;
  }, [onAddressesLoaded]);

  const requestRef = useRef(0);
  useEffect(() => {
    if (!activeEgoId) {
      setAddresses(new Map());
      onAddressesLoadedRef.current?.(new Map());
      return;
    }
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchAddresses(treeId, activeEgoId, controller.signal)
      .then((result) => {
        if (requestId !== requestRef.current) {
          return;
        }
        const indexed = indexAddresses(result);
        setAddresses(indexed);
        onAddressesLoadedRef.current?.(indexed);
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
        onAddressesLoadedRef.current?.(new Map());
      })
      .finally(() => {
        if (requestId === requestRef.current) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [treeId, activeEgoId, fetchAddresses, treeStructureVersion, addressRefreshKey]);

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
      fullscreenRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

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
  }, [svgWidth, svgHeight, filteredData.persons.length]);

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

  // Center viewport on a specific node position
  const handleCenterOnNode = (nodeId: string) => {
    const pos = positions.get(nodeId);
    if (pos && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      setPan({
        x: containerWidth / 2 - pos.x * zoom,
        y: containerHeight / 2 - pos.y * zoom,
      });
    }
  };

  // Client-side SVG Download/Export
  const handleExportSVG = () => {
    const svgElement = document.querySelector(".tree-graph__svg") as SVGSVGElement | null;
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
          // ignore CORS errors
        }
      }
    } catch (e) {
      // ignore
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
  };

  return (
    <div ref={fullscreenRef} className="tree-graph">
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

        {/* Branch Focus Mode Controls */}
        {activeSelectedId && (
          <button
            type="button"
            className={`btn btn-secondary tree-graph__focus-toggle-btn ${focusId === activeSelectedId ? "tree-graph__focus-toggle-btn--active" : ""}`}
            onClick={() => setFocusId(focusId === activeSelectedId ? null : activeSelectedId)}
            style={{
              marginLeft: "auto",
              fontSize: "0.8125rem",
              padding: "0.25rem 0.75rem",
              minHeight: "36px",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              border: focusId === activeSelectedId ? "1px solid var(--color-brand)" : undefined
            }}
          >
            {focusId === activeSelectedId ? (
              <>
                <span>✕</span> Hiện toàn bộ cây
              </>
            ) : (
              <>
                <span>👁</span> Xem riêng nhánh này
              </>
            )}
          </button>
        )}
        {focusId && !activeSelectedId && (
          <div
            className="tree-graph__focus-badge-container"
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8125rem",
              color: "var(--color-brand)",
              fontWeight: 600
            }}
          >
            <span>Đang xem một nhánh</span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: "0 0.5rem", minHeight: "28px", minWidth: "28px" }}
              onClick={() => setFocusId(null)}
              title="Hiện toàn bộ cây"
            >
              ✕
            </button>
          </div>
        )}
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
              {jointEdges.map((edge) => (
                <path
                  key={edge.key}
                  d={edge.pathData}
                  fill="none"
                  className={edge.className}
                  data-edge-style={edge.style}
                  data-joint-child-id={edge.childId}
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeDasharray={edge.strokeDash}
                  role="presentation"
                  aria-hidden={true}
                />
              ))}
              {filteredData.relationships
                .filter((rel) => !processedRelIds.has(rel.id))
                .map((rel) => {
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
              {filteredData.persons.map((person) => {
                const pos = positions.get(person.id);
                if (!pos) {
                  return null;
                }
                const address = addresses.get(person.id);
                const isEgo = person.id === activeEgoId;
                const isSelected = person.id === activeSelectedId;
                const label = isEgo
                  ? "Bản thân"
                  : loading || addresses.size === 0
                  ? ""
                  : capitalize(addressLabel(address));
                const unresolved = !isEgo && !loading && addresses.size > 0 && isUnresolved(address);
                const isRedacted = person.displayName === "Người thân còn sống";

                return (
                  <g
                    key={person.id}
                    className={`tree-graph__node ${loading ? "tree-graph__node--loading" : ""} tree-graph__node--${person.gender ?? "unknown"} ${person.deceased ? "tree-graph__node--deceased" : ""} ${person.claimed ? "tree-graph__node--claimed" : ""} ${isRedacted ? "tree-graph__node--redacted" : ""}`}
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
                        {/* Left gender status stripe */}
                        <div className="tree-graph__node-gender-strip" />
                        
                        <div className="tree-graph__node-content">
                          <div className="tree-graph__node-row-top">
                            <span className="tree-graph__node-name">
                              {person.displayName}
                            </span>
                            {person.deceased && (
                              <span className="tree-graph__node-deceased-marker" title="Đã mất">
                                †
                              </span>
                            )}
                            {person.claimed && (
                              <span className="tree-graph__node-claimed-badge" title="Tài khoản đã xác nhận">
                                <svg viewBox="0 0 24 24" className="tree-graph__node-badge-icon" aria-hidden="true">
                                  <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                              </span>
                            )}
                            {isEgo && (
                              <span className="tree-graph__node-ego-badge">
                                Bạn
                              </span>
                            )}
                          </div>
                          <div className="tree-graph__node-row-bottom">
                            <span
                              className="tree-graph__node-address"
                              data-address
                              data-unresolved={unresolved ? "true" : "false"}
                            >
                              {label}
                            </span>
                            {person.birthYear && (
                              <span className="tree-graph__node-lifespan">
                                {person.deceased ? `(${person.birthYear} - †)` : `(s. ${person.birthYear})`}
                              </span>
                            )}
                          </div>
                        </div>
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
          
          {/* Target Center selection button */}
          {activeSelectedId && (
            <button
              type="button"
              onClick={() => handleCenterOnNode(activeSelectedId)}
              className="btn btn-secondary"
              style={{
                minWidth: "40px",
                minHeight: "40px",
                padding: 0,
                fontSize: "1rem",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
              title="Căn giữa người được chọn"
            >
              🎯
            </button>
          )}

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
            <SearchIcon size={18} />
          </button>

          {/* Export SVG Button */}
          <button
            type="button"
            onClick={handleExportSVG}
            className="btn btn-secondary"
            style={{
              minWidth: "40px",
              minHeight: "40px",
              padding: 0,
              fontSize: "1rem",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
            title="Tải ảnh sơ đồ (SVG)"
          >
            <DownloadIcon size={18} />
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="btn btn-secondary"
            style={{
              minWidth: "40px",
              minHeight: "40px",
              padding: 0,
              fontSize: "1rem",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
            title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          >
            {isFullscreen ? <MinimizeIcon size={18} /> : <MaximizeIcon size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
