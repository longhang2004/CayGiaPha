import type { ReactNode } from "react";
import { PersonForm } from "@/components/person/PersonForm";
import { AddRelativeForm } from "@/components/person/AddRelativeForm";
import { PersonInfoPanel } from "@/components/graph/PersonInfoPanel";
import { DeletionDialog } from "@/components/deletion/DeletionDialog";
import { PersonPhotos } from "@/components/photos/PersonPhotos";
import { UpcomingEventsWidget } from "@/components/graph/UpcomingEventsWidget";
import { CloseIcon, LightbulbIcon } from "@/components/ui/Icons";
import { ClaimFlow } from "@/components/claim/ClaimFlow";
import { ContextualCoachMarks } from "@/components/guidance/ContextualCoachMarks";
import { reopenGuidanceChapter } from "@/lib/guidance/storage";
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

type PersonPanelMode = "view" | "create" | "edit" | "add-relative";

interface PanelFrameProps {
  mode: PersonPanelMode;
  eyebrow: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
  coach?: ReactNode;
  children: ReactNode;
}

function PanelFrame({
  mode,
  eyebrow,
  title,
  closeLabel,
  onClose,
  coach,
  children,
}: PanelFrameProps) {
  return (
    <div className="side-panel" data-panel-mode={mode}>
      <div className="side-panel__chrome">
        <div className="side-panel__heading">
          <p className="side-panel__eyebrow">{eyebrow}</p>
          <h3 className="side-panel__title">{title}</h3>
        </div>
        <button
          type="button"
          className="side-panel__close"
          onClick={onClose}
          aria-label={closeLabel}
        >
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="side-panel__content">
        {coach}
        <div className="side-panel__body" data-panel-scroll-region="person">
          {children}
        </div>
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
    createMode,
    editMode,
    addRelativeMode,
    addressLoading,
    capabilities,
    canEdit,
    setCreateMode,
    setEditMode,
    setAddRelativeMode,
    setSelectedId,
    setEgoId,
    refreshTree,
    claimInviteAction,
    upcomingEventsLoader,
    guidanceRole,
  } = useTreeContext();

  const selectedPerson = selectedId ? persons.find((p) => p.id === selectedId) : null;
  const selectedCapabilities = selectedPerson?.capabilities ?? capabilities;
  const canEditSelected = selectedCapabilities?.editContent ?? canEdit;
  const canEditSelectedRelationships =
    selectedCapabilities?.editRelationships ?? capabilities.editRelationships;
  const selectedSpouseRelationship = selectedPerson
    ? relationships.find(
        (relationship) =>
          relationship.type === "marriage" &&
          (relationship.sourceId === selectedPerson.id ||
            relationship.targetId === selectedPerson.id),
      )
    : undefined;
  const selectedSpouseId = selectedSpouseRelationship && selectedPerson
    ? selectedSpouseRelationship.sourceId === selectedPerson.id
      ? selectedSpouseRelationship.targetId
      : selectedSpouseRelationship.sourceId
    : undefined;

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
        deathStatus: selectedPerson.deceased ?? false,
        deathDay: selectedPerson.deathDay ?? undefined,
        deathMonth: selectedPerson.deathMonth ?? undefined,
        deathYear: selectedPerson.deathYear ?? undefined,
        deathCalendar: selectedPerson.deathCalendar ?? undefined,
        deathLunarLeap: selectedPerson.deathLunarLeap ?? undefined,
      }
    : undefined;

  const isPanelOpen = Boolean(createMode || selectedPerson || addRelativeMode);

  let panelContent: ReactNode;

  if (createMode && capabilities.editContent) {
    panelContent = (
      <PanelFrame
        mode="create"
        eyebrow="Thành viên"
        title="Thêm thành viên mới"
        closeLabel="Hủy"
        onClose={() => setCreateMode(false)}
      >
        <PersonForm
          mode="create"
          treeId={activeTreeId}
          persons={personOptions}
          onSuccess={() => {
            setCreateMode(false);
            refreshTree();
          }}
          onCancel={() => setCreateMode(false)}
          hideCancelButton={true}
        />
      </PanelFrame>
    );
  } else if (selectedPerson) {
    const closeSelectedMode = () => {
      if (editMode) setEditMode(false);
      else if (addRelativeMode) setAddRelativeMode(false);
      else setSelectedId(null);
    };

    if (editMode && canEditSelected) {
      panelContent = (
        <PanelFrame
          mode="edit"
          eyebrow="Chỉnh sửa thành viên"
          title={selectedPerson.displayName}
          closeLabel="Hủy chỉnh sửa"
          onClose={closeSelectedMode}
        >
          <PersonForm
            mode="edit"
            treeId={activeTreeId}
            personId={selectedPerson.id}
            initialValues={selectedInitialValues}
            spouseRelationship={selectedSpouseId
              ? {
                  relationshipId: selectedSpouseRelationship!.id,
                  spouseId: selectedSpouseId,
                  maritalStatus: selectedSpouseRelationship?.maritalStatus,
                }
              : undefined}
            onSuccess={() => {
              setEditMode(false);
              refreshTree();
            }}
            onCancel={() => setEditMode(false)}
            hideCancelButton={true}
          />
        </PanelFrame>
      );
    } else if (addRelativeMode && canEditSelectedRelationships) {
      panelContent = (
        <PanelFrame
          mode="add-relative"
          eyebrow="Quan hệ gia đình"
          title={`Thêm kết nối cho ${selectedPerson.displayName}`}
          closeLabel="Hủy thêm quan hệ"
          onClose={closeSelectedMode}
        >
          <AddRelativeForm
            treeId={activeTreeId}
            persons={personOptions}
            preselectedPersonId={selectedPerson.id}
            onCreated={() => {
              setAddRelativeMode(false);
              refreshTree();
            }}
            onCancel={() => setAddRelativeMode(false)}
            hideCancelButton={true}
          />
        </PanelFrame>
      );
    } else {
      panelContent = (
        <PanelFrame
          mode="view"
          eyebrow="Thông tin thành viên"
          title={selectedPerson.displayName}
          closeLabel="Bỏ chọn"
          onClose={closeSelectedMode}
          coach={(
            <ContextualCoachMarks
              chapter="person"
              role={guidanceRole}
              steps={PERSON_COACH_STEPS}
              enabled={true}
            />
          )}
        >
          <div data-guidance-anchor="person-info-address">
            <PersonInfoPanel
              person={selectedPerson}
              ego={selectedEgo}
              address={selectedAddress}
              loading={addressLoading}
              hideHeading={true}
            />
          </div>

          {canEditSelected ? (
            <section
              className="person-detail-section person-detail-section--actions"
              data-guidance-anchor="person-actions"
            >
              <div className="person-detail-section__header">
                <h4>Thao tác với thành viên</h4>
                <p>Sửa thông tin hoặc cập nhật quan hệ gia đình.</p>
              </div>
              <div className="person-actions">
                <button type="button" className="btn" onClick={() => setEditMode(true)}>
                  Chỉnh sửa thông tin
                </button>
                {canEditSelectedRelationships ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setAddRelativeMode(true)}
                  >
                    Thêm quan hệ
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEgoId(selectedPerson.id)}
                  disabled={egoId === selectedPerson.id || addressLoading}
                >
                  {egoId === selectedPerson.id
                    ? "Đang dùng để xét vai vế"
                    : "Xét vai vế theo người này"}
                </button>
              </div>
              <div className="person-danger-section">
                <h4>Thao tác cần xác nhận</h4>
                <p>Xóa thành viên sẽ ảnh hưởng đến các kết nối đang có trong cây.</p>
                <DeletionDialog
                  treeId={activeTreeId}
                  personId={selectedPerson.id}
                  triggerLabel="Xóa thành viên này"
                  className="btn-danger"
                  onDeleted={() => {
                    setSelectedId(null);
                    refreshTree();
                  }}
                />
              </div>
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

          <section
            className="person-detail-section"
            data-guidance-anchor="person-claim-photos"
          >
            <div className="person-detail-section__header">
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
              <p>Xem lại các bước dành riêng cho màn hình thông tin thành viên.</p>
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
  } else if (addRelativeMode && capabilities.editRelationships) {
    panelContent = (
      <PanelFrame
        mode="add-relative"
        eyebrow="Quan hệ gia đình"
        title="Thêm kết nối mới"
        closeLabel="Hủy"
        onClose={() => setAddRelativeMode(false)}
      >
        <AddRelativeForm
          treeId={activeTreeId}
          persons={personOptions}
          onCreated={() => {
            setAddRelativeMode(false);
            refreshTree();
          }}
          hideCancelButton={true}
        />
      </PanelFrame>
    );
  } else {
    panelContent = (
      <div className="side-panel side-panel--empty">
        <p>Chọn một người để xem thông tin và cách xưng hô.</p>
        <UpcomingEventsWidget treeId={activeTreeId} loadEvents={upcomingEventsLoader} />
      </div>
    );
  }

  return (
    <div
      data-graph-safe-exclude="panel"
      className={`tree-workspace__info-panel ${
        isPanelOpen ? "tree-workspace__info-panel--open" : ""
      }`}
    >
      {panelContent}
    </div>
  );
}
