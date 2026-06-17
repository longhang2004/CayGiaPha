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
import { PersonInfoPanel } from "./PersonInfoPanel";
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
}

const NODE_WIDTH = 130;
const NODE_HEIGHT = 36;

export function TreeGraph({
  treeId,
  persons,
  relationships,
  initialEgoId,
  fetchAddresses = fetchViewpointAddresses,
  selectedId,
  onSelectId,
}: TreeGraphProps) {
  const firstId = persons[0]?.id ?? "";
  const [egoId, setEgoId] = useState<string>(initialEgoId ?? firstId);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const activeSelectedId = selectedId !== undefined ? selectedId : internalSelectedId;
  const activeSetSelectedId = onSelectId ?? setInternalSelectedId;
  const [addresses, setAddresses] = useState<Map<string, Address>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const personById = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of persons) {
      map.set(p.id, p);
    }
    return map;
  }, [persons]);

  const positions = useMemo(() => layoutNodes(persons), [persons]);

  // Re-fetch every node's address whenever the viewpoint (ego) changes
  // (Requirements 10.1, 10.2).
  const requestRef = useRef(0);
  useEffect(() => {
    if (!egoId) {
      setAddresses(new Map());
      return;
    }
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchAddresses(treeId, egoId, controller.signal)
      .then((result) => {
        // Ignore stale responses from superseded viewpoint changes.
        if (requestId !== requestRef.current) {
          return;
        }
        setAddresses(indexAddresses(result));
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
      })
      .finally(() => {
        if (requestId === requestRef.current) {
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [treeId, egoId, fetchAddresses]);

  const handleSelectViewpoint = useCallback((nextEgoId: string) => {
    setEgoId(nextEgoId);
  }, []);

  const ego = egoId ? personById.get(egoId) ?? null : null;
  const selected = activeSelectedId ? personById.get(activeSelectedId) ?? null : null;

  const svgWidth = useMemo(() => {
    let max = 0;
    positions.forEach((p) => {
      max = Math.max(max, p.x);
    });
    return max + NODE_WIDTH + 40;
  }, [positions]);

  const svgHeight = useMemo(() => {
    let max = 0;
    positions.forEach((p) => {
      max = Math.max(max, p.y);
    });
    return max + NODE_HEIGHT + 40;
  }, [positions]);

  return (
    <div className="tree-graph">
      <div className="tree-graph__controls">
        <ViewpointSelector
          persons={persons}
          egoId={egoId}
          onChange={handleSelectViewpoint}
          disabled={loading}
        />
        <p role="status" aria-live="polite" className="tree-graph__status">
          {loading ? "Đang tính cách xưng hô…" : error ?? ""}
        </p>
      </div>

      <div className="tree-graph__canvas">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          role="group"
          aria-label="Sơ đồ gia phả"
          className="tree-graph__svg"
        >
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
              const isEgo = person.id === egoId;
              const isSelected = person.id === activeSelectedId;
              const label = isEgo ? "Bản thân" : addressLabel(address);
              const unresolved = !isEgo && isUnresolved(address);

              return (
                <g
                  key={person.id}
                  className="tree-graph__node"
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
        </svg>
      </div>

      <PersonInfoPanel
        person={selected}
        ego={ego}
        address={activeSelectedId ? addresses.get(activeSelectedId) : undefined}
      />
    </div>
  );
}
