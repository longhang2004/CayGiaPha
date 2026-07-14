"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  capitalize,
  contextualAddressLabel,
  fetchViewpointAddresses,
  indexAddresses,
  isUnresolved,
  type Address,
  type Person,
  type Relationship,
  type ViewpointAddresses,
} from "@/lib/graph";
import { GraphEdge } from "./EdgeStyles";
import { useTreeGraphLayout } from "./useTreeGraphLayout";
import { useTreeGraphZoom } from "./useTreeGraphZoom";
import { TreeGraphHeader, TreeGraphNavControls } from "./TreeGraphControls";
import { TreeGraphNode } from "./TreeGraphNode";

export interface TreeGraphProps {
  treeId: string;
  persons: Person[];
  relationships: Relationship[];
  initialEgoId?: string;
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
  addressRefreshKey?: number;
  focusId?: string | null;
  onFocusChange?: (id: string | null) => void;
  showBirthYears?: boolean;
  addresses?: Map<string, Address>;
  addressLoading?: boolean;
  addressError?: string | null;
}

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
  addresses: controlledAddresses,
  addressLoading: controlledAddressLoading,
  addressError: controlledAddressError,
}: TreeGraphProps) {
  const firstId = persons[0]?.id ?? "";
  const [internalEgoId, setInternalEgoId] = useState<string>(initialEgoId ?? firstId);
  const activeEgoId = egoId !== undefined ? egoId : internalEgoId;
  const activeSetEgoId = onEgoChange ?? setInternalEgoId;

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const activeSelectedId = selectedId !== undefined ? selectedId : internalSelectedId;
  const activeSetSelectedId = onSelectId ?? setInternalSelectedId;
  const [internalAddresses, setInternalAddresses] = useState<Map<string, Address>>(new Map());
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const activeAddresses = controlledAddresses ?? internalAddresses;
  const activeLoading = controlledAddressLoading ?? internalLoading;
  const activeError = controlledAddressError ?? internalError;

  const [internalFocusId, setInternalFocusId] = useState<string | null>(null);
  const activeFocusId = focusId !== undefined ? focusId : internalFocusId;
  const activeSetFocusId = onFocusChange ?? setInternalFocusId;

  useEffect(() => {
    onAddressLoading?.(activeLoading);
  }, [activeLoading, onAddressLoading]);

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

  const {
    filteredData,
    nodeWidthById,
    positions,
    jointEdges,
    processedRelIds,
    treeStructureVersion,
    svgWidth,
    svgHeight,
    NODE_HEIGHT
  } = useTreeGraphLayout(persons, relationships, activeEgoId, activeFocusId);

  const {
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
  } = useTreeGraphZoom(svgWidth, svgHeight, filteredData.persons.length, positions);

  const onAddressesLoadedRef = useRef(onAddressesLoaded);
  useEffect(() => {
    onAddressesLoadedRef.current = onAddressesLoaded;
  }, [onAddressesLoaded]);

  const requestRef = useRef(0);
  useEffect(() => {
    if (controlledAddresses !== undefined) {
      return;
    }
    if (!activeEgoId) {
      setInternalAddresses(new Map());
      onAddressesLoadedRef.current?.(new Map());
      return;
    }
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    setInternalLoading(true);
    setInternalError(null);

    fetchAddresses(treeId, activeEgoId, controller.signal)
      .then((result) => {
        if (requestId !== requestRef.current) {
          return;
        }
        const indexed = indexAddresses(result);
        setInternalAddresses(indexed);
        onAddressesLoadedRef.current?.(indexed);
      })
      .catch((err: unknown) => {
        if (requestId !== requestRef.current) {
          return;
        }
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setInternalError("Không tải được cách xưng hô cho góc nhìn này.");
        setInternalAddresses(new Map());
        onAddressesLoadedRef.current?.(new Map());
      })
      .finally(() => {
        if (requestId === requestRef.current) {
          setInternalLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [treeId, activeEgoId, fetchAddresses, treeStructureVersion, addressRefreshKey, controlledAddresses]);

  useEffect(() => {
    onSelectAddress?.(activeSelectedId ? activeAddresses.get(activeSelectedId) : undefined);
  }, [activeAddresses, activeSelectedId, onSelectAddress]);

  const ego = activeEgoId ? personById.get(activeEgoId) ?? null : null;

  useEffect(() => {
    onSelectEgo?.(ego);
  }, [ego, onSelectEgo]);

  const handleSelectViewpoint = useCallback((nextEgoId: string) => {
    activeSetEgoId(nextEgoId);
  }, [activeSetEgoId]);

  return (
    <div ref={fullscreenRef} className="tree-graph">
      <TreeGraphHeader
        hideViewpointSelector={hideViewpointSelector}
        persons={persons}
        activeEgoId={activeEgoId}
        loading={activeLoading}
        error={activeError}
        onSelectViewpoint={handleSelectViewpoint}
        onFocusChange={onFocusChange}
        activeSelectedId={activeSelectedId}
        activeFocusId={activeFocusId}
        onSetFocusId={activeSetFocusId}
      />

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
                const address = activeAddresses.get(person.id);
                const isEgo = person.id === activeEgoId;
                const isSelected = person.id === activeSelectedId;
                const label = isEgo
                  ? "Bản thân"
                  : activeLoading || activeAddresses.size === 0
                  ? ""
                  : capitalize(contextualAddressLabel({
                      targetId: person.id,
                      egoId: activeEgoId,
                      persons: filteredData.persons,
                      relationships: filteredData.relationships,
                      addresses: activeAddresses,
                    }));
                const unresolved = !isEgo && !activeLoading && activeAddresses.size > 0 && isUnresolved(address);
                const isRedacted = person.displayName === "Người thân còn sống";
                const hasCollapsedBranch = filteredData.collapsedBranchRoots.has(person.id);
                const nodeWidth = nodeWidthById.get(person.id) ?? 220; // NODE_MIN_WIDTH

                return (
                  <TreeGraphNode
                    key={person.id}
                    person={person}
                    pos={pos}
                    nodeWidth={nodeWidth}
                    nodeHeight={NODE_HEIGHT}
                    isEgo={isEgo}
                    isSelected={isSelected}
                    label={label}
                    unresolved={unresolved}
                    isRedacted={isRedacted}
                    hasCollapsedBranch={hasCollapsedBranch}
                    loading={activeLoading}
                    showBirthYears={showBirthYears}
                    onSelect={activeSetSelectedId}
                  />
                );
              })}
            </g>
          </g>
        </svg>

        <TreeGraphNavControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onCenterOnNode={handleCenterOnNode}
          onResetZoom={handleReset}
          onToggleFullscreen={handleToggleFullscreen}
          onExportSVG={handleExportSVG}
          isFullscreen={isFullscreen}
          activeSelectedId={activeSelectedId}
        />
      </div>
    </div>
  );
}
