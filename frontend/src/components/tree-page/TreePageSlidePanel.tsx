"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PersonForm } from "@/components/person/PersonForm";
import { AddConnectedPersonForm } from "@/components/person/AddConnectedPersonForm";
import { UpdateRelationshipForm } from "@/components/person/UpdateRelationshipForm";
import { PersonInfoPanel } from "@/components/graph/PersonInfoPanel";
import { DeletionDialog } from "@/components/deletion/DeletionDialog";
import { PersonPhotos } from "@/components/photos/PersonPhotos";
import { UpcomingEventsWidget } from "@/components/graph/UpcomingEventsWidget";
import { ChevronLeftIcon, CloseIcon, LightbulbIcon } from "@/components/ui/Icons";
import { ClaimFlow } from "@/components/claim/ClaimFlow";
import { ContextualCoachMarks } from "@/components/guidance/ContextualCoachMarks";
import { reopenGuidanceChapter } from "@/lib/guidance/storage";
import type { PersonPanelMode } from "./personPanelState";
import { useTreeContext } from "./TreeContext";

const PERSON_COACH_STEPS = [
  {
    topicId: "xem-thong-tin-va-xung-ho",
    anchorIds: ["person-info-address"],
  },
  {
    topicId: "sua-va-them-thanh-vien",
    anchorIds: ["person-actions"],
  },
  {
    topicId: "luu-anh-ky-niem",
    anchorIds: ["person-claim-photos"],
  },
];

interface PanelFrameProps {
  mode: PersonPanelMode;
  eyebrow: string;
  title: string;
  onBack?: () => void;
  onClose: () => void;
  coach?: ReactNode;
  discardDialog?: ReactNode;
  children: ReactNode;
}

function PanelFrame({
  mode,
  eyebrow,
  title,
  onBack,
  onClose,
  coach,
  discardDialog,
  children,
}: PanelFrameProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="side-panel" data-panel-mode={mode} role="dialog" aria-label={title}>
      <div className="side-panel__chrome">
        {onBack ? (
          <button
            type="button"
            className="side-panel__back"
            onClick={onBack}
            aria-label="Quay lại thông tin thành viên"
          >
            <ChevronLeftIcon size={20} />
          </button>
        ) : null}
        <div className="side-panel__heading">
          <p className="side-panel__eyebrow">{eyebrow}</p>
          <h3 className="side-panel__title">{title}</h3>
        </div>
        <button
          type="button"
          className="side-panel__close"
          onClick={onClose}
          aria-label="Đóng bảng thông tin thành viên"
        >
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="side-panel__content">
        {coach}
        <div className="side-panel__body" data-panel-scroll-region="person">
          {children}
        </div>
        {discardDialog}
      </div>
    </div>
  );
}

export function TreePageSlidePanel() {
  const {
    activeTreeId,
    persons,
    relationships,
    selectedId,
    selectedAddress,
    selectedEgo,
    egoId,
    personPanelMode,
    addressLoading,
    capabilities,
    canEdit,
    openPersonPanel,
    backPersonPanel,
    closePersonPanel,
    showCreatedPerson,
    setEgoId,
    refreshTree,
    claimInviteAction,
    upcomingEventsLoader,
    guidanceRole,
  } = useTreeContext();
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<"back" | "close" | null>(null);

  const selectedPerson = selectedId ? persons.find((person) => person.id === selectedId) : null;
  const selectedCapabilities = selectedPerson?.capabilities ?? capabilities;
  const canEditSelected = selectedCapabilities?.editContent ?? canEdit;
  const canEditSelectedRelationships = selectedCapabilities?.editRelationships ?? capabilities.editRelationships;
  const selectedSpouseRelationship = selectedPerson
    ? relationships.find(
        (relationship) =>
          relationship.type === "marriage" &&
          (relationship.sourceId === selectedPerson.id || relationship.targetId === selectedPerson.id),
      )
    : undefined;
  const selectedSpouseId = selectedSpouseRelationship && selectedPerson
    ? selectedSpouseRelationship.sourceId === selectedPerson.id
      ? selectedSpouseRelationship.targetId
      : selectedSpouseRelationship.sourceId
    : undefined;

  useEffect(() => {
    setIsDirty(false);
    setPendingNavigation(null);
  }, [personPanelMode, selectedId]);

  const personOptions = persons.map((person) => ({
    id: person.id,
    displayName: person.displayName,
    gender: person.gender,
  }));

  const selectedInitialValues = selectedPerson
    ? {
        displayName: selectedPerson.displayName,
        gender: selectedPerson.gender,
        birthOrder: selectedPerson.birthOrder ?? undefined,
        birthYear: selectedPerson.birthYear ?? undefined,
        phone: selectedPerson.phone ?? undefined,
        email: selectedPerson.email ?? undefined,
        deathStatus: selectedPerson.deceased ?? false,
        deathDay: selectedPerson.deathDay ?? undefined,
        deathMonth: selectedPerson.deathMonth ?? undefined,
        deathYear: selectedPerson.deathYear ?? undefined,
        deathCalendar: selectedPerson.deathCalendar ?? undefined,
        deathLunarLeap: selectedPerson.deathLunarLeap ?? undefined,
      }
    : undefined;

  const executeNavigation = (navigation: "back" | "close") => {
    setIsDirty(false);
    setPendingNavigation(null);
    if (navigation === "back") backPersonPanel();
    else closePersonPanel();
  };

  const requestNavigation = (navigation: "back" | "close") => {
    if (isDirty && personPanelMode !== "view") {
      setPendingNavigation(navigation);
      return;
    }
    executeNavigation(navigation);
  };

  const discardDialog = pendingNavigation ? (
    <div className="person-flow-discard" role="alertdialog" aria-modal="true" aria-labelledby="discard-person-flow-title">
      <h4 id="discard-person-flow-title">Bỏ các thay đổi?</h4>
      <p>Thông tin bạn vừa nhập chưa được lưu.</p>
      <div className="person-flow-discard__actions">
        <button type="button" className="btn btn-secondary" onClick={() => setPendingNavigation(null)}>
          Tiếp tục chỉnh sửa
        </button>
        <button type="button" className="btn btn-danger" onClick={() => executeNavigation(pendingNavigation)}>
          Bỏ thay đổi
        </button>
      </div>
    </div>
  ) : null;

  const isPanelOpen = Boolean(selectedPerson);
  let panelContent: ReactNode;

  if (!selectedPerson) {
    panelContent = (
      <div className="side-panel side-panel--empty">
        <p>Chọn một người để xem thông tin và cách xưng hô.</p>
        <UpcomingEventsWidget treeId={activeTreeId} loadEvents={upcomingEventsLoader} />
      </div>
    );
  } else if (personPanelMode === "edit" && canEditSelected) {
    panelContent = (
      <PanelFrame
        mode="edit"
        eyebrow="Chỉnh sửa thành viên"
        title={selectedPerson.displayName}
        onBack={() => requestNavigation("back")}
        onClose={() => requestNavigation("close")}
        discardDialog={discardDialog}
      >
        <PersonForm
          mode="edit"
          treeId={activeTreeId}
          personId={selectedPerson.id}
          initialValues={selectedInitialValues}
          persons={personOptions}
          spouseRelationship={selectedSpouseId
            ? {
                relationshipId: selectedSpouseRelationship!.id,
                spouseId: selectedSpouseId,
                maritalStatus: selectedSpouseRelationship?.maritalStatus,
              }
            : undefined}
          onDirtyChange={setIsDirty}
          onSuccess={() => {
            setIsDirty(false);
            backPersonPanel();
            refreshTree();
          }}
          hideCancelButton
        />
      </PanelFrame>
    );
  } else if (personPanelMode === "add-person" && canEditSelectedRelationships) {
    panelContent = (
      <PanelFrame
        mode="add-person"
        eyebrow="Thêm người mới"
        title={`Nối với ${selectedPerson.displayName}`}
        onBack={() => requestNavigation("back")}
        onClose={() => requestNavigation("close")}
        discardDialog={discardDialog}
      >
        <AddConnectedPersonForm
          treeId={activeTreeId}
          persons={persons}
          preferredAnchorId={selectedPerson.id}
          egoId={egoId}
          onDirtyChange={setIsDirty}
          onCreated={(personId) => {
            setIsDirty(false);
            refreshTree();
            showCreatedPerson(personId);
          }}
        />
      </PanelFrame>
    );
  } else if (personPanelMode === "update-relationship" && canEditSelectedRelationships) {
    panelContent = (
      <PanelFrame
        mode="update-relationship"
        eyebrow="Quan hệ gia đình"
        title={selectedPerson.displayName}
        onBack={() => requestNavigation("back")}
        onClose={() => requestNavigation("close")}
        discardDialog={discardDialog}
      >
        <UpdateRelationshipForm
          treeId={activeTreeId}
          persons={persons}
          relationships={relationships}
          anchorId={selectedPerson.id}
          onDirtyChange={setIsDirty}
          onSwitchToAddPerson={() => openPersonPanel(selectedPerson.id, "add-person")}
          onCreated={() => {
            setIsDirty(false);
            backPersonPanel();
            refreshTree();
          }}
        />
      </PanelFrame>
    );
  } else {
    panelContent = (
      <PanelFrame
        mode="view"
        eyebrow="Thông tin thành viên"
        title={selectedPerson.displayName}
        onClose={() => requestNavigation("close")}
        coach={(
          <ContextualCoachMarks
            chapter="person"
            role={guidanceRole}
            steps={PERSON_COACH_STEPS}
            enabled
          />
        )}
      >
        <PersonInfoPanel
          person={selectedPerson}
          ego={selectedEgo}
          address={selectedAddress}
          loading={addressLoading}
          hideHeading
          addressGuidanceAnchor="person-info-address"
        />

        {canEditSelected || canEditSelectedRelationships ? (
          <section className="person-detail-section person-detail-section--actions">
            <div className="person-detail-section__header">
              <h4>Thao tác với thành viên</h4>
              <p>Sửa hồ sơ hoặc nối người này với một thành viên khác.</p>
            </div>
            <div className="person-actions" data-guidance-anchor="person-actions">
              {canEditSelected ? (
                <button
                  type="button"
                  className="btn"
                  data-person-panel-focus-key={`edit-${selectedPerson.id}`}
                  onClick={(event) => openPersonPanel(selectedPerson.id, "edit", event.currentTarget)}
                >
                  Chỉnh sửa thông tin
                </button>
              ) : null}
              {canEditSelectedRelationships ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  data-person-panel-focus-key={`update-relationship-${selectedPerson.id}`}
                  onClick={(event) => openPersonPanel(selectedPerson.id, "update-relationship", event.currentTarget)}
                >
                  Cập nhật quan hệ
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEgoId(selectedPerson.id)}
                disabled={egoId === selectedPerson.id || addressLoading}
              >
                {egoId === selectedPerson.id ? "Đang dùng để xét vai vế" : "Xét vai vế theo người này"}
              </button>
            </div>
            {canEditSelected ? (
              <div className="person-danger-section">
                <h4>Thao tác cần xác nhận</h4>
                <p>Xóa thành viên sẽ ảnh hưởng đến các kết nối đang có trong cây.</p>
                <DeletionDialog
                  treeId={activeTreeId}
                  personId={selectedPerson.id}
                  triggerLabel="Xóa thành viên này"
                  className="btn-danger"
                  onDeleted={() => {
                    closePersonPanel();
                    refreshTree();
                  }}
                />
              </div>
            ) : null}
          </section>
        ) : null}

        {selectedCapabilities?.manageClaim && !selectedPerson.claimed ? (
          <section className="person-detail-section">
            <div className="person-detail-section__header">
              <h4>Xác nhận thành viên</h4>
              <p>Mời người thân liên kết tài khoản với hồ sơ này.</p>
            </div>
            <ClaimFlow
              mode="invite"
              treeId={activeTreeId}
              personId={selectedPerson.id}
              inviteAction={claimInviteAction}
            />
          </section>
        ) : null}

        <section className="person-detail-section">
          <div className="person-detail-section__header" data-guidance-anchor="person-claim-photos">
            <h4>Ảnh kỷ niệm</h4>
            <p>Lưu lại ảnh gia đình gắn với thành viên này.</p>
          </div>
          <PersonPhotos
            treeId={activeTreeId}
            personId={selectedPerson.id}
            canEdit={selectedCapabilities?.editPhotos ?? false}
          />
        </section>

        <section className="person-detail-section person-detail-section--help">
          <div className="person-detail-section__header">
            <h4>Cần hướng dẫn?</h4>
            <p>Xem lại hướng dẫn cho màn hình thông tin thành viên.</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            aria-label="Mở hướng dẫn thông tin thành viên"
            onClick={() => reopenGuidanceChapter("person")}
          >
            <LightbulbIcon size={18} />
            Mở hướng dẫn nhanh
          </button>
        </section>
      </PanelFrame>
    );
  }

  return (
    <div
      data-graph-safe-exclude="panel"
      className={`tree-workspace__info-panel ${isPanelOpen ? "tree-workspace__info-panel--open" : ""}`}
    >
      {panelContent}
    </div>
  );
}
