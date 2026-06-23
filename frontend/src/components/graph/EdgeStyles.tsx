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

  const props = {
    className: EDGE_CLASS[style],
    "data-edge-style": style,
    "data-relationship-id": relationship.id,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeDasharray: STROKE_DASHARRAY[style],
    role: "presentation",
    "aria-hidden": true,
  };

  const titleElement = label ? <title>{label}</title> : null;

  // bloodline_father / bloodline_mother: elbow connector dọc
  if (relationship.type === "bloodline_father" || relationship.type === "bloodline_mother") {
    const NODE_HEIGHT = 56;
    const HALF_HEIGHT = NODE_HEIGHT / 2;
    const midY = (source.y + target.y) / 2;
    const pathData = `M ${source.x} ${source.y + HALF_HEIGHT} L ${source.x} ${midY} L ${target.x} ${midY} L ${target.x} ${target.y - HALF_HEIGHT}`;
    return (
      <path d={pathData} fill="none" {...props}>
        {titleElement}
      </path>
    );
  }

  // marriage: đường ngang giữa 2 spouse với small indicator ╪ ở giữa
  if (relationship.type === "marriage") {
    const NODE_WIDTH = 160;
    const HALF_WIDTH = NODE_WIDTH / 2;
    const left = source.x < target.x ? source : target;
    const right = source.x < target.x ? target : source;
    const x1 = left.x + HALF_WIDTH;
    const y1 = left.y;
    const x2 = right.x - HALF_WIDTH;
    const y2 = right.y;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} {...props}>
          {titleElement}
        </line>
        <text
          x={midX}
          y={midY}
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          fontSize="14"
          fontWeight="bold"
          role="presentation"
          aria-hidden="true"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          ╪
        </text>
      </g>
    );
  }

  // Các loại khác: giữ nguyên logic hiện tại
  return (
    <line
      x1={source.x}
      y1={source.y + NODE_HALF_HEIGHT}
      x2={target.x}
      y2={target.y - NODE_HALF_HEIGHT}
      {...props}
    >
      {titleElement}
    </line>
  );
}
