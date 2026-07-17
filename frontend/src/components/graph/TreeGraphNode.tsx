import { memo } from "react";
import { TreeIcon } from "@/components/ui/Icons";
import { type Person, type Address } from "@/lib/graph";

export interface TreeGraphNodeProps {
  person: Person;
  pos: { x: number; y: number };
  nodeWidth: number;
  nodeHeight: number;
  isEgo: boolean;
  isSelected: boolean;
  label: string;
  unresolved: boolean;
  isRedacted: boolean;
  hasCollapsedBranch: boolean;
  loading: boolean;
  showBirthYears: boolean;
  onSelect: (id: string) => void;
}

export const TreeGraphNode = memo(function TreeGraphNode({
  person,
  pos,
  nodeWidth,
  nodeHeight,
  isEgo,
  isSelected,
  label,
  unresolved,
  isRedacted,
  hasCollapsedBranch,
  loading,
  showBirthYears,
  onSelect,
}: TreeGraphNodeProps) {
  return (
    <g
      className={`tree-graph__node ${loading ? "tree-graph__node--loading" : ""} tree-graph__node--${person.gender ?? "unknown"} ${person.deceased ? "tree-graph__node--deceased" : ""} ${person.claimed ? "tree-graph__node--claimed" : ""} ${isRedacted ? "tree-graph__node--redacted" : ""} ${hasCollapsedBranch ? "tree-graph__node--has-branch" : ""}`}
      data-person-id={person.id}
      data-ego={isEgo ? "true" : "false"}
      data-selected={isSelected ? "true" : "false"}
      transform={`translate(${pos.x - nodeWidth / 2}, ${pos.y - nodeHeight / 2})`}
    >
      <foreignObject width={nodeWidth} height={nodeHeight}>
        <button
          type="button"
          className="tree-graph__node-button"
          aria-pressed={isSelected}
          onClick={() => onSelect(person.id)}
          data-guidance-anchor="graph-person-node"
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
              title="Có nhánh gia đình mở rộng. Chọn người này rồi dùng làm người xét để xem."
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
            {isEgo ? "Người xét: Bạn" : label ? `Cách xưng hô: ${label}` : "Chưa rõ cách xưng hô"}
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
});
