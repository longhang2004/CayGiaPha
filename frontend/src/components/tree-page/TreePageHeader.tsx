"use client";

import { useRef, useState } from "react";
import { useSession } from "@/app/providers";
import { CGPDrawer } from "@/components/cgp";
import { ContextualCoachMarks } from "@/components/guidance/ContextualCoachMarks";
import { SearchPanel } from "@/components/search/SearchPanel";
import {
  ArrowLeftIcon,
  CenterIcon,
  CollaborationIcon,
  EditIcon,
  LightbulbIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
} from "@/components/ui/Icons";
import { getUxAccessRole, getUxViewportClass, trackUxEvent } from "@/lib/analytics/uxEvents";
import { reopenGuidanceChapter } from "@/lib/guidance/storage";
import { TreePersonPicker } from "./TreePersonPicker";
import { useTreeContext } from "./TreeContext";

const ACTION_COACH_STEPS = [
  { topicId: "dieu-huong-so-do", anchorIds: ["actions-search-viewpoint"] },
  { topicId: "sua-va-them-thanh-vien", anchorIds: ["actions-edit-add"] },
  { topicId: "thao-tac-trong-cay", anchorIds: ["actions-manage-help"] },
];

export interface TreePageHeaderProps {
  treeListHref?: string;
  helpHref?: string;
}

export function TreePageHeader({ treeListHref = "/tree", helpHref = "/help" }: TreePageHeaderProps) {
  const { user } = useSession();
  const viewpointTriggerRef = useRef<HTMLButtonElement>(null);
  const actionsTriggerRef = useRef<HTMLButtonElement>(null);
  const [isViewpointOpen, setIsViewpointOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const {
    activeTreeId,
    treeName,
    persons,
    addresses,
    egoId,
    selectedId,
    capabilities,
    accessRole,
    guidanceRole,
    setSelectedId,
    setEditMode,
    setAddRelativeMode,
    setCreateMode,
    setEgoId,
    setIsSettingsOpen,
    setIsCollaborationOpen,
  } = useTreeContext();

  const ego = persons.find((person) => person.id === egoId) ?? persons[0];
  const selectedPerson = selectedId ? persons.find((person) => person.id === selectedId) : null;
  const actionTarget = selectedPerson ?? ego;
  const actionTargetCapabilities = actionTarget?.capabilities ?? capabilities;
  const canAddRelative = Boolean(actionTarget && actionTargetCapabilities.editRelationships);
  const canEditSelected = Boolean(selectedPerson && actionTargetCapabilities.editContent);

  const closeActionDrawerAnd = (action: () => void) => {
    setIsActionsOpen(false);
    action();
  };

  const openAddRelative = () => {
    if (!actionTarget || !canAddRelative) return;
    setSelectedId(actionTarget.id);
    setCreateMode(false);
    setEditMode(false);
    setAddRelativeMode(true);
  };

  const changeViewpoint = (personId: string) => {
    setEgoId(personId);
    trackUxEvent("ux_core_flow_complete", {
      flow: "change_viewpoint",
      surface: "workspace_header",
      viewportClass: getUxViewportClass(),
      accessRole: getUxAccessRole(accessRole),
      outcome: "completed",
    });
  };

  return (
    <>
      <header className="tree-page-header" data-graph-safe-exclude="auto-y" title={treeName}>
        <a href={treeListHref} className="tree-page-header__back-link">
          <ArrowLeftIcon size={18} />
          <span>Các cây</span>
        </a>
        <div
          className="tree-page-header__context"
          aria-live="polite"
          data-guidance-anchor="workspace-context"
        >
          <span>Đang xem từ</span>
          <strong>{ego?.displayName ?? "Chưa chọn người"}</strong>
        </div>
        <button
          ref={viewpointTriggerRef}
          type="button"
          className="tree-page-header__viewpoint-button"
          onClick={() => setIsViewpointOpen(true)}
          data-guidance-anchor="workspace-viewpoint"
          aria-haspopup="dialog"
        >
          Đổi người
        </button>
      </header>

      <footer
        className="tree-workspace-actions"
        data-graph-safe-exclude="auto-y"
        data-guidance-anchor="workspace-actions"
        aria-label="Tác vụ cây gia phả"
      >
        {canAddRelative ? (
          <button
            type="button"
            className="tree-workspace-actions__primary"
            onClick={openAddRelative}
            data-guidance-anchor="workspace-add-relative"
          >
            <PlusIcon size={22} />
            <span>Thêm người thân</span>
          </button>
        ) : null}
        <button
          ref={actionsTriggerRef}
          type="button"
          className="tree-workspace-actions__secondary"
          onClick={() => setIsActionsOpen(true)}
          aria-expanded={isActionsOpen}
          aria-haspopup="dialog"
        >
          <span>Thao tác khác</span>
          <MoreHorizontalIcon size={22} />
        </button>
      </footer>

      <TreePersonPicker
        mode="viewpoint"
        persons={persons}
        addresses={addresses}
        egoId={egoId}
        selectedId={selectedId}
        isOpen={isViewpointOpen}
        onOpenChange={setIsViewpointOpen}
        onSelectPerson={changeViewpoint}
        returnFocusRef={viewpointTriggerRef}
      />

      <CGPDrawer
        presentation="modal"
        placement="right"
        label="Thao tác khác"
        isOpen={isActionsOpen}
        onOpenChange={setIsActionsOpen}
        returnFocusRef={actionsTriggerRef}
        className="tree-workspace-action-drawer"
        safeAreaEdge="right"
      >
        <div className="tree-workspace-action-drawer__header">
          <p>Thao tác với cây</p>
          <h2>Thao tác khác</h2>
        </div>
        <ContextualCoachMarks
          chapter="actions"
          role={guidanceRole}
          steps={ACTION_COACH_STEPS}
          enabled={isActionsOpen}
          helpHref={helpHref}
        />
        <div className="tree-workspace-action-drawer__list">
          <button
            type="button"
            aria-label="Tìm người"
            data-guidance-anchor="actions-search-viewpoint"
            onClick={() => closeActionDrawerAnd(() => setIsSearchOpen(true))}
          >
            <SearchIcon size={20} />
            <span><strong>Tìm người</strong><small>Tìm theo tên, vai vế hoặc bộ lọc</small></span>
          </button>
          <button
            type="button"
            aria-label="Đổi góc nhìn"
            onClick={() => closeActionDrawerAnd(() => setIsViewpointOpen(true))}
          >
            <CenterIcon size={20} />
            <span><strong>Đổi góc nhìn</strong><small>Tính lại cách xưng hô từ một người khác</small></span>
          </button>
          <button
            type="button"
            aria-label="Mở hướng dẫn nhanh"
            onClick={() => reopenGuidanceChapter("actions")}
          >
            <LightbulbIcon size={20} />
            <span><strong>Mở hướng dẫn nhanh</strong><small>Phát lại hướng dẫn trong ngăn thao tác này</small></span>
          </button>
          <a href={helpHref} aria-label="Trung tâm hướng dẫn" data-guidance-anchor="actions-manage-help">
            <LightbulbIcon size={20} />
            <span><strong>Trung tâm hướng dẫn</strong><small>Xem hướng dẫn đầy đủ theo việc đang làm</small></span>
          </a>

          {canEditSelected ? (
            <button
              type="button"
              aria-label="Sửa người đang chọn"
              data-guidance-anchor="actions-edit-add"
              onClick={() => closeActionDrawerAnd(() => {
                setAddRelativeMode(false);
                setCreateMode(false);
                setEditMode(true);
              })}
            >
              <EditIcon size={20} />
              <span><strong>Sửa người đang chọn</strong><small>{selectedPerson?.displayName}</small></span>
            </button>
          ) : null}
          {capabilities.editContent ? (
            <button
              type="button"
              aria-label="Thêm thành viên khác"
              data-guidance-anchor={canEditSelected ? undefined : "actions-edit-add"}
              onClick={() => closeActionDrawerAnd(() => {
                setSelectedId(null);
                setAddRelativeMode(false);
                setEditMode(false);
                setCreateMode(true);
              })}
            >
              <PlusIcon size={20} />
              <span><strong>Thêm thành viên khác</strong><small>Thêm người chưa có quan hệ trực tiếp</small></span>
            </button>
          ) : null}
          {capabilities.manageTree ? (
            <button type="button" aria-label="Cài đặt cây" onClick={() => closeActionDrawerAnd(() => setIsSettingsOpen(true))}>
              <SettingsIcon size={20} />
              <span><strong>Cài đặt cây</strong><small>Tên cây, quyền riêng tư và hiển thị</small></span>
            </button>
          ) : null}
          {user && capabilities.manageCollaboration ? (
            <button type="button" aria-label="Cộng tác" onClick={() => closeActionDrawerAnd(() => setIsCollaborationOpen(true))}>
              <CollaborationIcon size={20} />
              <span><strong>Cộng tác</strong><small>Quản lý người cùng chỉnh sửa cây</small></span>
            </button>
          ) : null}
        </div>
      </CGPDrawer>

      <CGPDrawer
        presentation="modal"
        placement="right"
        label="Tìm người"
        isOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        returnFocusRef={actionsTriggerRef}
        className="tree-workspace-search-drawer"
        safeAreaEdge="right"
      >
        <div className="tree-workspace-search-drawer__header">
          <p>Tìm trong {treeName}</p>
          <h2>Tìm người</h2>
        </div>
        <SearchPanel
          presentation="drawer"
          treeId={activeTreeId}
          persons={persons}
          addresses={addresses}
          egoId={egoId}
          viewpointId={egoId}
          onSelectResult={(personId) => {
            setSelectedId(personId);
            setEditMode(false);
            setAddRelativeMode(false);
            setCreateMode(false);
            setIsSearchOpen(false);
          }}
        />
      </CGPDrawer>
    </>
  );
}
