import { useSession } from "@/app/providers";
import { PersonForm } from "@/components/person/PersonForm";
import { AddRelativeForm } from "@/components/person/AddRelativeForm";
import { PersonInfoPanel } from "@/components/graph/PersonInfoPanel";
import { DeletionDialog } from "@/components/deletion/DeletionDialog";
import { PersonPhotos } from "@/components/photos/PersonPhotos";
import { UpcomingEventsWidget } from "@/components/graph/UpcomingEventsWidget";
import { CloseIcon } from "@/components/ui/Icons";
import { useTreeContext } from "./TreeContext";

export function TreePageSlidePanel() {
  const { user } = useSession();
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
    canEdit,
    isOwner,
    setCreateMode,
    setEditMode,
    setAddRelativeMode,
    setSelectedId,
    setEgoId,
    refreshTree,
  } = useTreeContext();

  const selectedPerson = selectedId ? persons.find((p) => p.id === selectedId) : null;
  const selectedSpouseRelationship = selectedPerson
    ? relationships.find((r) => r.type === "marriage" && (r.sourceId === selectedPerson.id || r.targetId === selectedPerson.id))
    : undefined;
  const selectedSpouseId = selectedSpouseRelationship && selectedPerson
    ? (selectedSpouseRelationship.sourceId === selectedPerson.id
      ? selectedSpouseRelationship.targetId
      : selectedSpouseRelationship.sourceId)
    : undefined;

  const personOptions = persons.map((p) => ({ id: p.id, displayName: p.displayName, gender: p.gender }));

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

  const isPanelOpen = !!(createMode || selectedPerson || addRelativeMode);

  return (
    <div data-graph-safe-exclude="panel" className={`tree-workspace__info-panel ${isPanelOpen ? "tree-workspace__info-panel--open" : ""}`}>
      {createMode ? (
        <div className="surface-card side-panel" style={{ position: "relative" }}>
          <button
            type="button"
            className="side-panel__close"
            onClick={() => setCreateMode(false)}
            aria-label="Hủy"
          >
            <CloseIcon size={20} />
          </button>
          <h3 className="side-panel__title">Thêm thành viên mới</h3>
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
        </div>
      ) : selectedPerson ? (
        <div className="surface-card side-panel" style={{ position: "relative" }}>
          <button
            type="button"
            className="side-panel__close"
            onClick={() => {
              if (editMode) setEditMode(false);
              else if (addRelativeMode) setAddRelativeMode(false);
              else setSelectedId(null);
            }}
            aria-label="Bỏ chọn"
          >
            <CloseIcon size={20} />
          </button>

          {(editMode || addRelativeMode) && (
            <h3 className="side-panel__title">
              {selectedPerson.displayName}
            </h3>
          )}

          {editMode ? (
            <div>
              <h4 style={{ margin: "1rem 0" }}>Chỉnh sửa thông tin</h4>
              <PersonForm
                mode="edit"
                treeId={activeTreeId}
                personId={selectedPerson.id}
                initialValues={selectedInitialValues}
                spouseRelationship={selectedSpouseId ? {
                  spouseId: selectedSpouseId,
                  maritalStatus: selectedSpouseRelationship?.maritalStatus,
                } : undefined}
                onSuccess={() => {
                  setEditMode(false);
                  refreshTree();
                }}
                onCancel={() => setEditMode(false)}
                hideCancelButton={true}
              />
            </div>
          ) : addRelativeMode ? (
            <div>
              <h4 style={{ margin: "1rem 0" }}>Thêm kết nối cho {selectedPerson.displayName}</h4>
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
            </div>
          ) : (
            <div>
              <PersonInfoPanel
                person={selectedPerson}
                ego={selectedEgo}
                address={selectedAddress}
                loading={addressLoading}
                hideHeading={true}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                {canEdit && (
                  <div className="person-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setEditMode(true)}
                    >
                      Chỉnh sửa thông tin
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setAddRelativeMode(true)}
                    >
                      Thêm quan hệ
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEgoId(selectedPerson.id)}
                      disabled={egoId === selectedPerson.id || addressLoading}
                    >
                      {egoId === selectedPerson.id ? "Đang là góc nhìn" : "Chuyển góc nhìn này"}
                    </button>
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
                )}
              </div>

              <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1rem" }}>
                <PersonPhotos
                  treeId={activeTreeId}
                  personId={selectedPerson.id}
                  canEdit={isOwner}
                />
              </div>
            </div>
          )}
        </div>
      ) : addRelativeMode ? (
        <div className="surface-card side-panel" style={{ position: "relative" }}>
          <button
            type="button"
            className="side-panel__close"
            onClick={() => setAddRelativeMode(false)}
            aria-label="Hủy"
          >
            <CloseIcon size={20} />
          </button>
          <h3 className="side-panel__title">Thêm kết nối mới</h3>
          <AddRelativeForm
            treeId={activeTreeId}
            persons={personOptions}
            onCreated={() => {
              setAddRelativeMode(false);
              refreshTree();
            }}
            hideCancelButton={true}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="surface-card side-panel">
            <p style={{ color: "var(--color-muted)", margin: 0, textAlign: "center" }}>
              Chọn một người để xem thông tin và cách xưng hô.
            </p>
          </div>
          <UpcomingEventsWidget treeId={activeTreeId} />
        </div>
      )}
    </div>
  );
}
