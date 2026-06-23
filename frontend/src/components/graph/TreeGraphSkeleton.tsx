import { Skeleton } from "@/components/ui/Skeleton";

export function TreeGraphSkeleton() {
  return (
    <div className="tree-graph" aria-busy="true" aria-label="Đang tải sơ đồ…">
      {/* Controls bar placeholder */}
      <div className="tree-graph__controls">
        <Skeleton variant="rect" width="100%" height="2.5rem" />
      </div>
      {/* Canvas với nodes placeholder */}
      <div className="tree-graph__canvas" style={{ height: "550px", position: "relative" }}>
        <svg width="100%" height="100%">
          {/* Generation 0: couple */}
          <SkeletonNode cx={300} cy={100} />
          <SkeletonNode cx={480} cy={100} />
          <line
            x1="332"
            y1="100"
            x2="448"
            y2="100"
            stroke="var(--color-hairline-strong)"
            strokeWidth="2"
          />
          {/* Vertical to gen 1 */}
          <line
            x1="390"
            y1="128"
            x2="390"
            y2="220"
            stroke="var(--color-hairline)"
            strokeWidth="2"
          />
          {/* Generation 1: ego */}
          <SkeletonNode cx={390} cy={248} />
        </svg>
      </div>
    </div>
  );
}

function SkeletonNode({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g transform={`translate(${cx - 80}, ${cy - 28})`}>
      <rect
        width="160"
        height="56"
        rx="8"
        fill="var(--color-hairline-soft)"
        className="skeleton"
      />
    </g>
  );
}
