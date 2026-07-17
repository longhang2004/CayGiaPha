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
import { getRectangleBoundaryPoint, type GraphSize } from "./treeGraphGeometry";

export interface GraphEdgeProps {
  relationship: Relationship;
  source: NodePosition;
  target: NodePosition;
  sourceSize: GraphSize;
  targetSize: GraphSize;
}

export function GraphEdge({
  relationship,
  source,
  target,
  sourceSize,
  targetSize,
}: GraphEdgeProps) {
  const isUnidentified =
    (relationship.derivationState as string) === "unidentified" ||
    (relationship.type === "asserted" && (relationship.assertedLabel || "").toLowerCase().includes("chưa xác định"));

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
  const sourceBoundary = getRectangleBoundaryPoint(source, target, sourceSize);
  const targetBoundary = getRectangleBoundaryPoint(target, source, targetSize);

  if (isUnidentified) {
    const x1 = sourceBoundary.x;
    const y1 = sourceBoundary.y;
    const x2 = targetBoundary.x;
    const y2 = targetBoundary.y;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const labelWidth = 64;
    const labelTextWidth = 56;
    return (
      <g>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          {...props}
          strokeDasharray="4,4"
          className="edge-unidentified"
          style={{ stroke: "#94a3b8" }}
        />
        <rect
          x={midX - labelWidth / 2}
          y={midY - 8}
          width={labelWidth}
          height={16}
          rx={4}
          fill="var(--color-surface, #ffffff)"
          stroke="#cbd5e1"
        />
        <text
          x={midX}
          y={midY}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#64748b"
          fontSize="9"
          textLength={labelTextWidth}
          lengthAdjust="spacingAndGlyphs"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          Chưa xác định
        </text>
      </g>
    );
  }

  // bloodline_father / bloodline_mother: elbow connector dọc (fail-safe fallback)
  if (relationship.type === "bloodline_father" || relationship.type === "bloodline_mother") {
    const sourceHalfHeight = sourceSize.height / 2;
    const targetHalfHeight = targetSize.height / 2;
    const midY = (source.y + target.y) / 2;
    const pathData = `M ${source.x} ${source.y + sourceHalfHeight} L ${source.x} ${midY} L ${target.x} ${midY} L ${target.x} ${target.y - targetHalfHeight}`;
    return (
      <path d={pathData} fill="none" {...props}>
        {titleElement}
      </path>
    );
  }

  // marriage: đường ngang giữa 2 spouse với small indicator ╪ ở giữa
  if (relationship.type === "marriage") {
    const sourceIsLeft = source.x < target.x;
    const left = sourceIsLeft ? source : target;
    const right = sourceIsLeft ? target : source;
    const leftSize = sourceIsLeft ? sourceSize : targetSize;
    const rightSize = sourceIsLeft ? targetSize : sourceSize;
    const x1 = left.x + leftSize.width / 2;
    const y1 = left.y;
    const x2 = right.x - rightSize.width / 2;
    const y2 = right.y;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} {...props}>
          {titleElement}
        </line>
      </g>
    );
  }

  // Các loại khác: giữ nguyên logic hiện tại
  return (
    <line
      x1={sourceBoundary.x}
      y1={sourceBoundary.y}
      x2={targetBoundary.x}
      y2={targetBoundary.y}
      {...props}
    >
      {titleElement}
    </line>
  );
}
