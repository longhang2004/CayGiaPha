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
  capitalize,
  contextualAddressLabel,
  collapseExtendedFamilyBranches,
  fetchViewpointAddresses,
  indexAddresses,
  isUnresolved,
  layoutMultiTreeNodes,
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
import { SearchIcon, DownloadIcon, MaximizeIcon, MinimizeIcon, TreeIcon } from "@/components/ui/Icons";

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
  focusId?: string | null;
  onFocusChange?: (id: string | null) => void;
  showBirthYears?: boolean;
}

const NODE_MIN_WIDTH = 220;
const NODE_MAX_WIDTH = 460;
const NODE_HEIGHT = 90;

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
  focusId,
  onFocusChange,
  showBirthYears = true,
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
  const [internalFocusId, setInternalFocusId] = useState<string | null>(null);
  const activeFocusId = focusId !== undefined ? focusId : internalFocusId;
  const activeSetFocusId = onFocusChange ?? setInternalFocusId;

  // Notify parent of address loading state changes
  useEffect(() => {
    onAddressLoading?.(loading);
  }, [loading, onAddressLoading]);

  // Reset focusId if it's no longer in the list of persons
  useEffect(() => {
    if (activeFocusId && !persons.some((p) => p.id === activeFocusId)) {
      activeSetFocusId(null);
    }
  }, [persons, activeFocusId, activeSetFocusId]);

  const personById = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of persons) {
      map.set(p.id, p);
    }
    return map;
  }, [persons]);

  const egoScopedData = useMemo(
    () => collapseExtendedFamilyBranches(persons, relationships, activeEgoId),
    [persons, relationships, activeEgoId],
  );

  // Branch focus filtering logic: keeps the focused person, their descendants, and descendants' spouses
  const filteredData = useMemo(() => {
    if (!activeFocusId) {
      return egoScopedData;
    }

    const descendantIds = new Set<string>();
    descendantIds.add(activeFocusId);

    const childrenOf = new Map<string, string[]>();
    egoScopedData.relationships.forEach((r) => {
      if (r.type === "bloodline_father" || r.type === "bloodline_mother") {
        if (!childrenOf.has(r.sourceId)) childrenOf.set(r.sourceId, []);
        childrenOf.get(r.sourceId)!.push(r.targetId);
      }
    });

    const queue = [activeFocusId];
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
    egoScopedData.relationships.forEach((r) => {
      if (r.type === "marriage") {
        if (descendantIds.has(r.sourceId)) {
          spouseIds.add(r.targetId);
        } else if (descendantIds.has(r.targetId)) {
          spouseIds.add(r.sourceId);
        }
      }
    });

    const keepIds = new Set([...descendantIds, ...spouseIds]);

    const filteredPersons = egoScopedData.persons.filter((p) => keepIds.has(p.id));
    const filteredRels = egoScopedData.relationships.filter(
      (r) => keepIds.has(r.sourceId) && keepIds.has(r.targetId)
    );

    return {
      persons: filteredPersons,
      relationships: filteredRels,
      collapsedBranchRoots: new Set(
        [...egoScopedData.collapsedBranchRoots].filter((id) => keepIds.has(id)),
      ),
    };
  }, [egoScopedData, activeFocusId]);

  const nodeWidthById = useMemo(() => {
    const widths = new Map<string, number>();
    filteredData.persons.forEach((person) => {
      const nameLength = Array.from(person.displayName || "").length;
      const hasCollapsedBranch = filteredData.collapsedBranchRoots.has(person.id);
      const badgeWidth = hasCollapsedBranch ? 78 : 0;
      const statusWidth = (person.claimed ? 18 : 0) + (person.deceased ? 18 : 0) + (person.id === activeEgoId ? 38 : 0);
      const estimatedNameWidth = nameLength * 9.2;
      const chromeWidth = 112 + badgeWidth + statusWidth;
      const width = Math.ceil(Math.min(NODE_MAX_WIDTH, Math.max(NODE_MIN_WIDTH, chromeWidth + estimatedNameWidth)));
      widths.set(person.id, width);
    });
    return widths;
  }, [filteredData.persons, filteredData.collapsedBranchRoots, activeEgoId]);

  const maxNodeWidth = useMemo(() => {
    let max = NODE_MIN_WIDTH;
    nodeWidthById.forEach((width) => {
      max = Math.max(max, width);
    });
    return max;
  }, [nodeWidthById]);

  const positions = useMemo(
    () => layoutMultiTreeNodes(filteredData.persons, filteredData.relationships, { cellWidth: maxNodeWidth + 40, cellHeight: 150, padding: 100 }),
    [filteredData.persons, filteredData.relationships, maxNodeWidth]
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
      relationshipIds: string;
    }[] = [];
    const processedIds = new Set<string>();

    // Map children to their parent-child relationships and parent IDs
    const childParentsMap = new Map<string, string[]>();
    const childRelsMap = new Map<string, Relationship[]>();

    filteredData.relationships.forEach((rel) => {
      if (rel.type === "bloodline_father" || rel.type === "bloodline_mother") {
        if (!childParentsMap.has(rel.targetId)) childParentsMap.set(rel.targetId, []);
        childParentsMap.get(rel.targetId)!.push(rel.sourceId);

        if (!childRelsMap.has(rel.targetId)) childRelsMap.set(rel.targetId, []);
        childRelsMap.get(rel.targetId)!.push(rel);
      }
    });

    // Group children by parentUnitId (either sorted fatherId-motherId or single parentId)
    // If a child has only 1 parent, check if that parent has a marriage relationship in the tree.
    // If they do, we treat the couple as the parent unit so they share the midpoint.
    const parentUnitChildren = new Map<string, { childId: string; rels: Relationship[] }[]>();
    childParentsMap.forEach((parents, childId) => {
      let resolvedParents = [...parents];
      if (resolvedParents.length === 1) {
        const p1 = resolvedParents[0];
        const marriageRel = filteredData.relationships.find(
          (r) =>
            r.type === "marriage" &&
            (r.sourceId === p1 || r.targetId === p1)
        );
        if (marriageRel) {
          resolvedParents = [marriageRel.sourceId, marriageRel.targetId];
        }
      }

      const parentUnitId = resolvedParents.sort().join(":");
      if (!parentUnitChildren.has(parentUnitId)) {
        parentUnitChildren.set(parentUnitId, []);
      }
      parentUnitChildren.get(parentUnitId)!.push({
        childId,
        rels: childRelsMap.get(childId) || []
      });
    });

    // Group parent units by their parent generation Y coordinate so we can assign tracks
    const parentUnitsByY = new Map<number, string[]>();
    parentUnitChildren.forEach((_, parentUnitId) => {
      const parents = parentUnitId.split(":");
      const firstParentPos = positions.get(parents[0]);
      if (firstParentPos) {
        const y = firstParentPos.y;
        if (!parentUnitsByY.has(y)) parentUnitsByY.set(y, []);
        parentUnitsByY.get(y)!.push(parentUnitId);
      }
    });

    // Assign a unique track index for each parent unit at each Y level
    const parentUnitTrackIdx = new Map<string, number>();
    parentUnitsByY.forEach((unitIds, y) => {
      unitIds.sort((a, b) => {
        const getMidX = (uid: string) => {
          const parents = uid.split(":");
          const pos0 = positions.get(parents[0]);
          const pos1 = parents[1] ? positions.get(parents[1]) : undefined;
          if (pos0 && pos1) return (pos0.x + pos1.x) / 2;
          if (pos0) return pos0.x;
          return 0;
        };
        return getMidX(a) - getMidX(b);
      });
      unitIds.forEach((uid, idx) => {
        parentUnitTrackIdx.set(uid, idx);
      });
    });

    // Draw the joint elbow connectors
    parentUnitChildren.forEach((childrenInfo, parentUnitId) => {
      const parents = parentUnitId.split(":");
      const pos0 = positions.get(parents[0]);
      const pos1 = parents[1] ? positions.get(parents[1]) : undefined;

      if (!pos0) return;

      const midParentX = pos1 ? (pos0.x + pos1.x) / 2 : pos0.x;
      const parentY = pos1 ? (pos0.y + pos1.y) / 2 : pos0.y;

      const trackIdx = parentUnitTrackIdx.get(parentUnitId) ?? 0;
      // Offset alternates vertically between -14, 0, and +14 pixels
      const trackOffset = 14 * ((trackIdx % 3) - 1);

      childrenInfo.forEach(({ childId, rels }) => {
        const childPos = positions.get(childId);
        if (!childPos) return;

        // Mark relationships as processed
        rels.forEach((r) => processedIds.add(r.id));

        const midY = (parentY + childPos.y) / 2 + trackOffset;

        const isDashed = rels.some((r) => edgeStyleFor(r) === "dashed");
        const style = isDashed ? "dashed" : "solid";
        const strokeDash = STROKE_DASHARRAY[style];
        const className = EDGE_CLASS[style];

        const NODE_HEIGHT = 90;
        const HALF_HEIGHT = NODE_HEIGHT / 2;

        const pathData = `M ${midParentX} ${parentY} L ${midParentX} ${midY} L ${childPos.x} ${midY} L ${childPos.x} ${childPos.y - HALF_HEIGHT}`;

        jointEdgesList.push({
          key: `joint-${childId}`,
          pathData,
          className,
          style,
          strokeDash,
          childId,
          relationshipIds: rels.map((r) => r.id).join(","),
        });
      });
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
    return max + maxNodeWidth + 100;
  }, [positions, maxNodeWidth]);

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
      fullscreenRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Center and fit the tree initially and on size changes
  useEffect(() => {
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

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
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
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
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
  };

  const handleTouchEnd = () => {
    pinchStartRef.current = null;
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = 1.05;
    const nextZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    setZoom(clampZoom(nextZoom));
  };

  const handleZoomIn = () => setZoom((z) => Math.min(3, z * 1.2));
  const handleZoomOut = () => setZoom((z) => Math.max(0.3, z / 1.2));
  const handleReset = () => {
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
      {!hideViewpointSelector && (
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

          {/* Branch Focus Mode Controls (only shown if not controlled externally by parent) */}
          {!onFocusChange && activeSelectedId && (
            <button
              type="button"
              className={`btn btn-secondary tree-graph__focus-toggle-btn ${activeFocusId === activeSelectedId ? "tree-graph__focus-toggle-btn--active" : ""}`}
              onClick={() => activeSetFocusId(activeFocusId === activeSelectedId ? null : activeSelectedId)}
              style={{
                marginLeft: "auto",
                fontSize: "0.8125rem",
                padding: "0.25rem 0.75rem",
                minHeight: "36px",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                border: activeFocusId === activeSelectedId ? "1px solid var(--color-brand)" : undefined
              }}
            >
              {activeFocusId === activeSelectedId ? (
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
          {!onFocusChange && activeFocusId && !activeSelectedId && (
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
                onClick={() => activeSetFocusId(null)}
                title="Hiện toàn bộ cây"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      <div
        ref={containerRef}
        className="tree-graph__canvas"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
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
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
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
                  data-relationship-id={edge.relationshipIds}
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
                  : capitalize(contextualAddressLabel({
                      targetId: person.id,
                      egoId: activeEgoId,
                      persons: filteredData.persons,
                      relationships: filteredData.relationships,
                      addresses,
                    }));
                const unresolved = !isEgo && !loading && addresses.size > 0 && isUnresolved(address);
                const isRedacted = person.displayName === "Người thân còn sống";
                const hasCollapsedBranch = filteredData.collapsedBranchRoots.has(person.id);
                const nodeWidth = nodeWidthById.get(person.id) ?? NODE_MIN_WIDTH;

                return (
                  <g
                    key={person.id}
                    className={`tree-graph__node ${loading ? "tree-graph__node--loading" : ""} tree-graph__node--${person.gender ?? "unknown"} ${person.deceased ? "tree-graph__node--deceased" : ""} ${person.claimed ? "tree-graph__node--claimed" : ""} ${isRedacted ? "tree-graph__node--redacted" : ""} ${hasCollapsedBranch ? "tree-graph__node--has-branch" : ""}`}
                    data-person-id={person.id}
                    data-ego={isEgo ? "true" : "false"}
                    data-selected={isSelected ? "true" : "false"}
                    transform={`translate(${pos.x - nodeWidth / 2}, ${pos.y - NODE_HEIGHT / 2})`}
                  >
                    <foreignObject width={nodeWidth} height={NODE_HEIGHT}>
                      <button
                        type="button"
                        className="tree-graph__node-button"
                        aria-pressed={isSelected}
                        onClick={() => activeSetSelectedId(person.id)}
                      >
                        {/* Avatar tròn với chữ cái đầu */}
                        <div className="tree-graph__node-avatar" aria-hidden="true">
                          {person.displayName ? person.displayName.trim().charAt(0).toUpperCase() : "?"}
                        </div>
                        
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
                            {label && (
                              <span
                                className="tree-graph__node-address"
                                data-address
                                data-unresolved={unresolved ? "true" : "false"}
                              >
                                {label}
                              </span>
                            )}
                            {showBirthYears && person.birthYear && (
                              <span className="tree-graph__node-lifespan">
                                {person.deceased ? `(${person.birthYear} - †)` : `(s. ${person.birthYear})`}
                              </span>
                            )}
                          </div>
                        </div>
                        {hasCollapsedBranch && (
                          <span
                            className="tree-graph__node-branch-badge"
                            title="Có nhánh gia đình mở rộng. Chọn người này rồi chuyển góc nhìn để xem."
                            aria-label="Có nhánh mở rộng"
                          >
                            <TreeIcon size={13} />
                            <span>Nhánh</span>
                          </span>
                        )}
                      </button>

                      {/* Tooltip Hover/Focus */}
                      <div className="tree-graph__node-tooltip" role="tooltip">
                        <div style={{ fontWeight: "bold" }}>{person.displayName}</div>
                        <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>
                          {isEgo ? "Góc nhìn: Bạn" : label ? `Cách xưng hô: ${label}` : "Chưa rõ cách xưng hô"}
                        </div>
                        {person.birthYear && (
                          <div style={{ fontSize: "0.75rem", opacity: 0.9 }}>
                            {person.deceased ? `Mất năm: ${person.deathYear || "không rõ"}` : `Sinh năm: ${person.birthYear}`}
                          </div>
                        )}
                        {person.claimed && <div style={{ fontSize: "0.7rem", color: "#60a5fa", marginTop: "2px" }}>✓ Đã xác minh</div>}
                        {hasCollapsedBranch && (
                          <div style={{ fontSize: "0.7rem", color: "var(--color-brand)", marginTop: "2px" }}>
                            Có nhánh mở rộng
                          </div>
                        )}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Floating Zoom & Pan Controls */}
        <div className="tree-graph__nav-controls">
          <button
            type="button"
            onClick={handleZoomIn}
            className="btn btn-secondary"
            style={{
              minWidth: "48px",
              minHeight: "48px",
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
              minWidth: "48px",
              minHeight: "48px",
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
                minWidth: "48px",
                minHeight: "48px",
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
              minWidth: "48px",
              minHeight: "48px",
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
              minWidth: "48px",
              minHeight: "48px",
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
              minWidth: "48px",
              minHeight: "48px",
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
