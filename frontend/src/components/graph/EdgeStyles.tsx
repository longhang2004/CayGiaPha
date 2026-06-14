/**
 * Renders a single relationship as an SVG line with one of the THREE distinct
 * edge styles (Requirements 5.3, 6.3, 12.4, 15.6).
 *
 * The style is encoded three ways so it is unambiguously distinguishable both
 * visually and in tests:
 *   - a stable CSS class (`edge-solid` / `edge-dashed` / `edge-non-bloodline`),
 *   - the SVG `stroke-dasharray` attribute,
 *   - a `data-edge-style` attribute.
 */

import {
  EDGE_CLASS,
  STROKE_DASHARRAY,
  edgeStyleFor,
  type NodePosition,
  type Relationship,
} from "@/lib/graph";

export interface GraphEdgeProps {
  relationship: Relationship;
  source: NodePosition;
  target: NodePosition;
}

/** Offset so the line meets the node box edge rather than its center. */
const NODE_HALF_HEIGHT = 18;

export function GraphEdge({ relationship, source, target }: GraphEdgeProps) {
  const style = edgeStyleFor(relationship);
  const label =
    relationship.type === "asserted"
      ? relationship.assertedLabel ?? undefined
      : relationship.type === "non_bloodline"
        ? relationship.socialType ?? undefined
        : undefined;

  return (
    <line
      x1={source.x}
      y1={source.y + NODE_HALF_HEIGHT}
      x2={target.x}
      y2={target.y - NODE_HALF_HEIGHT}
      className={EDGE_CLASS[style]}
      data-edge-style={style}
      data-relationship-id={relationship.id}
      stroke="currentColor"
      strokeWidth={2}
      strokeDasharray={STROKE_DASHARRAY[style]}
      role="presentation"
      aria-hidden="true"
    >
      {label ? <title>{label}</title> : null}
    </line>
  );
}
