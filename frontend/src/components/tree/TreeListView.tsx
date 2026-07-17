import type { ReactNode } from "react";

export interface TreeListViewItem {
  id: string;
  name: string;
  region: "Bac" | "Trung" | "Nam";
  accessRole: "OWNER" | "CONTRIBUTOR" | "LINKED";
}

interface TreeListViewProps {
  trees: TreeListViewItem[];
  onAddTree: () => void;
  onOpenTree: (treeId: string) => void;
  onDeleteTree?: (treeId: string, treeName: string) => void;
  description?: string;
  emptyGuidance?: ReactNode;
  notice?: ReactNode;
}

const ACCESS_ROLE_LABEL: Record<TreeListViewItem["accessRole"], string> = {
  OWNER: "Chủ cây",
  CONTRIBUTOR: "Cộng tác viên",
  LINKED: "Thành viên đã xác nhận",
};

const REGION_LABEL: Record<TreeListViewItem["region"], string> = {
  Bac: "Bắc",
  Trung: "Trung",
  Nam: "Nam",
};

export function TreeListView({
  trees,
  onAddTree,
  onOpenTree,
  onDeleteTree,
  description = "Quản lý những cây gia phả bạn sở hữu hoặc đang cộng tác.",
  emptyGuidance,
  notice,
}: TreeListViewProps) {
  return (
    <div className="tree-list-page__content">
      <header className="tree-list-page__header">
        <div className="tree-list-page__intro">
          <p className="eyebrow tree-list-page__eyebrow">Không gian gia đình</p>
          <h1 id="tree-list-title">Cây gia phả của bạn</h1>
          <p>{description}</p>
        </div>
        <div className="tree-list-page__summary">
          <p className="tree-list-page__count" aria-live="polite">
            {trees.length} cây gia phả
          </p>
          <button
            type="button"
            className="btn btn-primary btn-terracotta tree-list-page__add"
            onClick={onAddTree}
          >
            + Thêm cây
          </button>
        </div>
      </header>

      {notice}

      <section className="tree-list-page__catalog" aria-labelledby="tree-list-title">
        {trees.length === 0 ? (
          <div className="tree-list-page__empty">
            <span className="tree-list-page__empty-index" aria-hidden="true">01</span>
            <div className="tree-list-page__empty-copy">
              <p className="eyebrow">Bắt đầu từ một người</p>
              <h2>Chào mừng bạn đến với Cây Gia Phả</h2>
              <p>Bạn chưa sở hữu hoặc tham gia cộng tác bất kỳ cây gia phả nào.</p>
              <p>Chọn Thêm cây để tạo cây mới hoặc tham gia cây của người thân bằng mã mời.</p>
            </div>
            {emptyGuidance ? (
              <div className="tree-list-page__empty-guidance">{emptyGuidance}</div>
            ) : null}
          </div>
        ) : (
          <ol className="tree-list-page__list">
            {trees.map((tree, index) => (
              <li key={tree.id} className="tree-list-card">
                <span className="tree-list-card__index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="tree-list-card__main">
                  <h2>{tree.name}</h2>
                  <dl className="tree-list-card__meta">
                    <div>
                      <dt>Vai trò</dt>
                      <dd>{ACCESS_ROLE_LABEL[tree.accessRole]}</dd>
                    </div>
                    <div>
                      <dt>Phương ngữ</dt>
                      <dd>{REGION_LABEL[tree.region]}</dd>
                    </div>
                  </dl>
                </div>
                <div className="tree-list-card__actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-terracotta"
                    onClick={() => onOpenTree(tree.id)}
                  >
                    Xem sơ đồ
                  </button>
                  {tree.accessRole === "OWNER" && onDeleteTree ? (
                    <button
                      type="button"
                      className="btn btn-secondary tree-list-card__delete"
                      onClick={() => onDeleteTree(tree.id, tree.name)}
                    >
                      Xóa
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
