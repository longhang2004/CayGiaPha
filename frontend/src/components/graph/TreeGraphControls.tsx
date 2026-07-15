import { useState } from "react";
import {
  CenterIcon,
  DownloadIcon,
  LightbulbIcon,
  MaximizeIcon,
  MinimizeIcon,
  MinusIcon,
  PlusIcon,
  ResetViewIcon,
  SettingsIcon,
} from "@/components/ui/Icons";
import { type Person } from "@/lib/graph";
import { GraphLegend } from "./GraphLegend";
import { ViewpointSelector } from "./ViewpointSelector";

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

      {!onFocusChange && activeSelectedId ? (
        <button
          type="button"
          className={`btn btn-secondary tree-graph__focus-toggle-btn ${activeFocusId === activeSelectedId ? "tree-graph__focus-toggle-btn--active" : ""}`}
          onClick={() => onSetFocusId(activeFocusId === activeSelectedId ? null : activeSelectedId)}
        >
          {activeFocusId === activeSelectedId ? "Hiện toàn bộ cây" : "Xem riêng nhánh này"}
        </button>
      ) : null}
      {!onFocusChange && activeFocusId && !activeSelectedId ? (
        <div className="tree-graph__focus-badge-container">
          <span>Đang xem một nhánh</span>
          <button type="button" className="btn btn-secondary" onClick={() => onSetFocusId(null)}>
            Hiện toàn bộ cây
          </button>
        </div>
      ) : null}
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
  activeEgoId: string;
  helpHref?: string;
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
  activeEgoId,
  helpHref = "/help",
}: TreeGraphNavControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="tree-graph__nav-shell"
      data-expanded={isExpanded ? "true" : "false"}
      data-graph-safe-exclude="right"
      data-guidance-anchor="graph-navigation"
    >
      <button
        type="button"
        className="tree-graph__nav-toggle"
        aria-expanded={isExpanded}
        aria-controls="tree-graph-navigation-controls"
        onClick={() => setIsExpanded((current) => !current)}
      >
        <SettingsIcon />
        <span>Điều khiển sơ đồ</span>
      </button>

      <div id="tree-graph-navigation-controls" className="tree-graph__nav-controls">
        <button type="button" onClick={onZoomIn} className="tree-graph__nav-button" title="Phóng to" aria-label="Phóng to">
          <PlusIcon size={18} />
          <span>Phóng to</span>
        </button>
        <button type="button" onClick={onZoomOut} className="tree-graph__nav-button" title="Thu nhỏ" aria-label="Thu nhỏ">
          <MinusIcon size={18} />
          <span>Thu nhỏ</span>
        </button>
        <button
          type="button"
          onClick={() => onCenterOnNode(activeEgoId)}
          className="tree-graph__nav-button"
          title="Căn giữa người đang xem"
          aria-label="Căn giữa người đang xem"
        >
          <CenterIcon size={18} />
          <span>Về người đang xem</span>
        </button>
        {activeSelectedId ? (
          <button
            type="button"
            onClick={() => onCenterOnNode(activeSelectedId)}
            className="tree-graph__nav-button"
            title="Căn giữa người được chọn"
            aria-label="Căn giữa người được chọn"
          >
            <CenterIcon size={18} />
            <span>Căn giữa người chọn</span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={onResetZoom}
          className="tree-graph__nav-button"
          title="Đặt lại góc nhìn"
          aria-label="Đặt lại góc nhìn"
        >
          <ResetViewIcon size={18} />
          <span>Đặt lại</span>
        </button>
        <button
          type="button"
          onClick={onExportSVG}
          className="tree-graph__nav-button"
          title="Tải ảnh sơ đồ (SVG)"
          aria-label="Tải SVG"
        >
          <DownloadIcon size={18} />
          <span>Tải SVG</span>
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="tree-graph__nav-button"
          title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
        >
          {isFullscreen ? <MinimizeIcon size={18} /> : <MaximizeIcon size={18} />}
          <span>{isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}</span>
        </button>
        <GraphLegend />
        <a href={helpHref} className="tree-graph__nav-button" aria-label="Hướng dẫn sơ đồ">
          <LightbulbIcon size={18} />
          <span>Hướng dẫn</span>
        </a>
      </div>
    </div>
  );
}
