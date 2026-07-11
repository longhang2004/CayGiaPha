import { useSession } from "@/app/providers";
import { SearchPanel } from "@/components/search/SearchPanel";
import { ViewpointSelector } from "@/components/graph/ViewpointSelector";
import { GraphLegend } from "@/components/graph/GraphLegend";
import { CollaborationIcon, LightbulbIcon, PlusIcon } from "@/components/ui/Icons";
import { GUIDANCE_REOPEN_EVENT } from "@/lib/guidance/storage";
import { useTreeContext } from "./TreeContext";

export function TreePageHeader() {
  const { user } = useSession();
  const {
    activeTreeId,
    treeName,
    persons,
    addresses,
    egoId,
    selectedId,
    addressLoading,
    canEdit,
    setSelectedId,
    setEditMode,
    setAddRelativeMode,
    setCreateMode,
    setEgoId,
    setIsCollaborationOpen,
  } = useTreeContext();

  return (
    <div className="tree-page-header" data-graph-safe-exclude="bottom">
      <div className="tree-page-header__row-one">
        {/* Brand — hidden on tablet/mobile via CSS */}
        <div className="tree-page-header__brand">
          <img src="/logo.svg" alt="Logo Cây Gia Phả" className="tree-page-header__logo" />
          <div className="tree-page-header__title-container">
            <h1 className="tree-page-header__title">{treeName}</h1>
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
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.dispatchEvent(new Event(GUIDANCE_REOPEN_EVENT))}
            title="Hướng dẫn"
            aria-label="Mở hướng dẫn"
          >
            <LightbulbIcon size={18} />
            <span className="hide-on-tablet hide-on-mobile">Hướng dẫn</span>
          </button>
          {user && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCollaborationOpen(true)}
              title="Cộng tác"
              aria-label="Cộng tác"
            >
              <CollaborationIcon size={18} />
              <span className="hide-on-tablet hide-on-mobile">Cộng tác</span>
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
            >
              <PlusIcon size={18} />
              <span className="hide-on-tablet hide-on-mobile">Thêm thành viên</span>
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
