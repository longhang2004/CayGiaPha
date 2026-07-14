import { useSession } from "@/app/providers";
import { SearchPanel } from "@/components/search/SearchPanel";
import { ViewpointSelector } from "@/components/graph/ViewpointSelector";
import { GraphLegend } from "@/components/graph/GraphLegend";
import { CollaborationIcon, LightbulbIcon, PlusIcon } from "@/components/ui/Icons";
import { useTreeContext } from "./TreeContext";

export interface TreePageHeaderProps {
  treeListHref?: string;
  helpHref?: string;
}

export function TreePageHeader({ treeListHref = "/tree", helpHref = "/help" }: TreePageHeaderProps) {
  const { user } = useSession();
  const {
    activeTreeId,
    treeName,
    persons,
    addresses,
    egoId,
    selectedId,
    addressLoading,
    capabilities,
    canEdit,
    setSelectedId,
    setEditMode,
    setAddRelativeMode,
    setCreateMode,
    setEgoId,
    setIsCollaborationOpen,
  } = useTreeContext();

  return (
    <div className="tree-page-header" data-graph-safe-exclude="auto-y">
      <div className="tree-page-header__row-one">
        {/* Brand — hidden on tablet/mobile via CSS */}
        <div className="tree-page-header__brand">
          <img src="/logo.svg" alt="Logo Cây Gia Phả" className="tree-page-header__logo" />
          <div className="tree-page-header__title-container">
            <a href={treeListHref} className="tree-page-header__title" style={{ textDecoration: "none", color: "inherit" }}>{treeName}</a>
            <span className="tree-page-header__count">{persons.length} thành viên</span>
          </div>
        </div>

        {/* Search — grows to fill space */}
        <div className="tree-page-header__search-container" data-guidance-anchor="graph-search">
          <SearchPanel
            treeId={activeTreeId}
            persons={persons}
            addresses={addresses}
            egoId={egoId}
            viewpointId={selectedId || undefined}
            onSelectResult={(id) => {
              setSelectedId(id);
              setEditMode(false);
              setAddRelativeMode(false);
            }}
          />
        </div>

        {/* Viewpoint — inline on desktop, hidden on tablet (moved to row-two) */}
        <div className="tree-page-header__viewpoint-inline" data-guidance-anchor="graph-viewpoint">
          <ViewpointSelector
            persons={persons}
            egoId={egoId}
            onChange={setEgoId}
            disabled={addressLoading}
          />
        </div>

        {/* Actions */}
        <div className="tree-page-header__actions">
          <span data-guidance-anchor="graph-legend"><GraphLegend /></span>
          <a
            href={treeListHref}
            className="btn btn-secondary"
            title="Danh sách cây"
            aria-label="Danh sách cây"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            <span>🌳</span>
            <span style={{ fontSize: "0.8125rem" }}>Cây</span>
          </a>
          <a
            href={helpHref}
            className="btn btn-secondary"
            title="Hướng dẫn"
            aria-label="Mở hướng dẫn"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.25rem" }}
          >
            <LightbulbIcon size={18} />
            <span style={{ fontSize: "0.8125rem" }}>Hướng dẫn</span>
          </a>
          {user && capabilities.manageCollaboration && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCollaborationOpen(true)}
              title="Cộng tác"
              aria-label="Cộng tác"
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <CollaborationIcon size={18} />
              <span style={{ fontSize: "0.8125rem" }}>Cộng tác</span>
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className="btn btn-primary btn-terracotta"
              onClick={() => {
                setSelectedId(null);
                setCreateMode(true);
                setAddRelativeMode(false);
                setEditMode(false);
              }}
              title="Thêm thành viên"
              aria-label="Thêm thành viên"
              data-guidance-anchor="graph-add-person"
              style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
            >
              <PlusIcon size={18} />
              <span style={{ fontSize: "0.8125rem" }}>Thêm</span>
            </button>
          )}
        </div>
      </div>

      {/* Row 2 — viewpoint on tablet/mobile only (hidden on desktop via CSS) */}
      <div className="tree-page-header__row-two">
        <div className="tree-page-header__viewpoint" data-guidance-anchor="graph-viewpoint">
          <ViewpointSelector
            persons={persons}
            egoId={egoId}
            onChange={setEgoId}
            disabled={addressLoading}
          />
        </div>
      </div>
    </div>
  );
}
