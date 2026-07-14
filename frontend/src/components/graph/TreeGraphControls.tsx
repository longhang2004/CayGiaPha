import { ViewpointSelector } from "./ViewpointSelector";
import { CenterIcon, DownloadIcon, MaximizeIcon, MinimizeIcon } from "@/components/ui/Icons";
import { type Person } from "@/lib/graph";

export interface TreeGraphHeaderProps {
  hideViewpointSelector: boolean;
  persons: Person[];
  activeEgoId: string;
  loading: boolean;
  error: string | null;
  onSelectViewpoint: (id: string) => void;

  onFocusChange?: (id: string | null) => void;
  activeSelectedId: string | null;
  activeFocusId: string | null;
  onSetFocusId: (id: string | null) => void;
}

export function TreeGraphHeader({
  hideViewpointSelector,
  persons,
  activeEgoId,
  loading,
  error,
  onSelectViewpoint,
  onFocusChange,
  activeSelectedId,
  activeFocusId,
  onSetFocusId,
}: TreeGraphHeaderProps) {
  if (hideViewpointSelector) return null;

  return (
    <div className="tree-graph__controls">
      <ViewpointSelector
        persons={persons}
        egoId={activeEgoId}
        onChange={onSelectViewpoint}
        disabled={loading}
      />
      <p role="status" aria-live="polite" className="tree-graph__status">
        {loading ? "Đang tính cách xưng hô…" : error ?? ""}
      </p>

      {/* Branch Focus Mode Controls (only shown if not controlled externally by parent) */}
      {!onFocusChange && activeSelectedId && (
        <button
          type="button"
          className={`btn btn-secondary tree-graph__focus-toggle-btn ${activeFocusId === activeSelectedId ? "tree-graph__focus-toggle-btn--active" : ""}`}
          onClick={() => onSetFocusId(activeFocusId === activeSelectedId ? null : activeSelectedId)}
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
            onClick={() => onSetFocusId(null)}
            title="Hiện toàn bộ cây"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export interface TreeGraphNavControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterOnNode: (id: string) => void;
  onResetZoom: () => void;
  onToggleFullscreen: () => void;
  onExportSVG: () => void;
  isFullscreen: boolean;
  activeSelectedId: string | null;
}

export function TreeGraphNavControls({
  onZoomIn,
  onZoomOut,
  onCenterOnNode,
  onResetZoom,
  onToggleFullscreen,
  onExportSVG,
  isFullscreen,
  activeSelectedId,
}: TreeGraphNavControlsProps) {
  return (
      <div className="tree-graph__nav-controls" data-graph-safe-exclude="right" data-guidance-anchor="graph-navigation">
        <button
          type="button"
          onClick={onZoomIn}
          className="btn btn-secondary"
          style={{
            minWidth: "48px",
            minHeight: "48px",
            padding: "0 0.5rem",
            fontSize: "1rem",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
          title="Phóng to"
        >
          <span style={{ fontSize: "1.25rem" }}>+</span>
          <span style={{ fontSize: "0.75rem" }}>Phóng to</span>
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="btn btn-secondary"
          style={{
            minWidth: "48px",
            minHeight: "48px",
            padding: "0 0.5rem",
            fontSize: "1rem",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
          title="Thu nhỏ"
        >
          <span style={{ fontSize: "1.25rem" }}>−</span>
          <span style={{ fontSize: "0.75rem" }}>Thu nhỏ</span>
        </button>

        {/* Target Center selection button */}
        {activeSelectedId && (
          <button
            type="button"
            onClick={() => onCenterOnNode(activeSelectedId)}
            className="btn btn-secondary"
            style={{
              minWidth: "48px",
              minHeight: "48px",
              padding: "0 0.5rem",
              fontSize: "1rem",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
            }}
            title="Căn giữa người được chọn"
          >
            <span>🎯</span>
            <span style={{ fontSize: "0.75rem" }}>Căn giữa</span>
          </button>
        )}

        <button
          type="button"
          onClick={onResetZoom}
          className="btn btn-secondary"
          style={{
            minWidth: "48px",
            minHeight: "48px",
            padding: "0 0.5rem",
            fontSize: "1rem",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
          }}
          title="Đặt lại góc nhìn"
        >
          <CenterIcon size={18} />
          <span style={{ fontSize: "0.75rem" }}>Đặt lại</span>
        </button>

        <button
          type="button"
          onClick={onExportSVG}
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

        <button
          type="button"
          onClick={onToggleFullscreen}
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
  );
}
