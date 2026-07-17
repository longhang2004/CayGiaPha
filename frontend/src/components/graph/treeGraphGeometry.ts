export interface GraphPoint {
  x: number;
  y: number;
}

export interface GraphSize {
  width: number;
  height: number;
}

export interface TreeGraphMetrics {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  generationGap: number;
  componentGap: number;
  worldPadding: number;
  cellWidth: number;
  cellHeight: number;
}

const MIN_TEXT_SCALE = 100;
const MAX_TEXT_SCALE = 200;

export function getTreeGraphMetrics(textScale: number): TreeGraphMetrics {
  const scale = Math.max(MIN_TEXT_SCALE, Math.min(MAX_TEXT_SCALE, textScale));
  const progress = (scale - MIN_TEXT_SCALE) / (MAX_TEXT_SCALE - MIN_TEXT_SCALE);
  const nodeWidth = Math.round(176 + 32 * progress);
  const nodeHeight = Math.round(128 + 56 * progress);
  const horizontalGap = 24;
  const generationGap = 96;

  return {
    nodeWidth,
    nodeHeight,
    horizontalGap,
    generationGap,
    componentGap: 72,
    worldPadding: 64,
    cellWidth: nodeWidth + horizontalGap,
    cellHeight: nodeHeight + generationGap,
  };
}

export function getGraphWorldSize(
  positions: Map<string, GraphPoint>,
  metrics: Pick<TreeGraphMetrics, "nodeWidth" | "nodeHeight" | "worldPadding">,
): GraphSize {
  if (positions.size === 0) {
    return { width: 0, height: 0 };
  }

  let maxX = 0;
  let maxY = 0;
  positions.forEach((position) => {
    maxX = Math.max(maxX, position.x);
    maxY = Math.max(maxY, position.y);
  });

  return {
    width: maxX + metrics.nodeWidth / 2 + metrics.worldPadding,
    height: maxY + metrics.nodeHeight / 2 + metrics.worldPadding,
  };
}

export function getRectangleBoundaryPoint(
  center: GraphPoint,
  toward: GraphPoint,
  size: GraphSize,
): GraphPoint {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (dx === 0 && dy === 0) {
    return center;
  }

  const xScale = dx === 0 ? Number.POSITIVE_INFINITY : size.width / 2 / Math.abs(dx);
  const yScale = dy === 0 ? Number.POSITIVE_INFINITY : size.height / 2 / Math.abs(dy);
  const scale = Math.min(xScale, yScale);

  return {
    x: center.x + dx * scale,
    y: center.y + dy * scale,
  };
}
