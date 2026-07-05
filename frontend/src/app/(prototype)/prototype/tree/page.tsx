"use client";

/**
 * Prototype: Tree workspace (populated state)
 *
 * Mirrors: src/app/tree/page.tsx (populated tree — persons.length > 0 path)
 *
 * Key differences from the real page:
 *  - Wrapped in MockSessionProvider (no real login required).
 *  - `persons` and `relationships` are pre-seeded with MOCK_* constants.
 *  - API mutating calls (save, delete, share) are stubbed to no-ops.
 *  - `fetchAddresses` on TreeGraph is stubbed to return empty addresses
 *    instantly, avoiding backend calls.
 *  - Accepts `?panel=settings` to open the settings modal by default.
 *
 * ⚠️  Dev/local only — gated by the (prototype) layout.
 *
 * SYNC RULE: When src/app/tree/page.tsx UI/UX changes (layout, components,
 * interactions, CSS classes, accessible labels, data-testid attributes),
 * update this file in the SAME commit/PR.
 */

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TreeGraph } from "@/components/graph/TreeGraph";
import { useToast } from "@/components/ui/ToastProvider";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/FormControls";
import { PersonForm } from "@/components/person/PersonForm";
import { AddRelativeForm } from "@/components/person/AddRelativeForm";
import { DeletionDialog } from "@/components/deletion/DeletionDialog";
import { SearchPanel } from "@/components/search/SearchPanel";
import { RegionSelector } from "@/components/region/RegionSelector";
import { PersonPhotos } from "@/components/photos/PersonPhotos";
import { TextSizeControl } from "@/components/a11y/TextSizeControl";
import { PersonInfoPanel } from "@/components/graph/PersonInfoPanel";
import { ViewpointSelector } from "@/components/graph/ViewpointSelector";
import { UpcomingEventsWidget } from "@/components/graph/UpcomingEventsWidget";
import type { Person, Relationship, Address, ViewpointAddresses } from "@/lib/graph";
import type { Region } from "@/lib/region";
import { MockSessionProvider } from "@/lib/prototype/mockSession";
import {
  MOCK_PERSONS,
  MOCK_RELATIONSHIPS,
  PROTOTYPE_TREE_ID,
  MOCK_USER,
} from "@/lib/prototype/mockData";
import "@/components/graph/graph.css";
import { CollaborationIcon, PlusIcon, CloseIcon } from "@/components/ui/Icons";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

/** Stub fetchAddresses that resolves immediately with no addresses. */
async function mockFetchAddresses(
  _treeId: string,
  egoId: string,
): Promise<ViewpointAddresses> {
  return {
    egoId,
    addresses: [
      { personId: "cu-noi-ong", resolved: "cụ nội ông", status: "resolved" },
      { personId: "cu-noi-ba", resolved: "cụ nội bà", status: "resolved" },
      { personId: "ong-noi", resolved: "ông nội", status: "resolved" },
      { personId: "ba-noi", resolved: "bà nội", status: "resolved" },
      { personId: "ong-ngoai", resolved: "ông ngoại", status: "resolved" },
      { personId: "bac", resolved: "bác", status: "resolved" },
      { personId: "bac-dau", resolved: "bác dâu", status: "resolved" },
      { personId: "ba", resolved: "ba", status: "resolved" },
      { personId: "ma", resolved: "má", status: "resolved" },
      { personId: "co", resolved: "cô", status: "resolved" },
      { personId: "duong", resolved: "dượng", status: "resolved" },
      { personId: "chu", resolved: "chú", status: "resolved" },
      { personId: "thim", resolved: "thím", status: "resolved" },
      { personId: "di", resolved: "dì", status: "resolved" },
      { personId: "cau", resolved: "cậu", status: "resolved" },
      { personId: "mo", resolved: "mợ", status: "resolved" },
      { personId: "anh-ho", resolved: "anh họ", status: "resolved" },
      { personId: "chi-dau-ho", resolved: "chị dâu họ", status: "resolved" },
      { personId: "anh-ruot", resolved: "anh ruột", status: "resolved" },
      { personId: "chi-dau", resolved: "chị dâu", status: "resolved" },
      { personId: "ego", resolved: "bản thân", status: "resolved" },
      { personId: "vo", resolved: "vợ", status: "resolved" },
      { personId: "em", resolved: "em gái", status: "resolved" },
      { personId: "em-re", resolved: "em rể", status: "resolved" },
      { personId: "em-ho-noi", resolved: "em họ", status: "resolved" },
      { personId: "em-ho-noi-vo", resolved: "mợ họ", status: "resolved" },
      { personId: "em-ho-ngoai", resolved: "em họ", status: "resolved" },
      { personId: "em-ho-ngoai-chong", resolved: "dượng họ", status: "resolved" },
      { personId: "con-trai", resolved: "con trai", status: "resolved" },
      { personId: "con-gai", resolved: "con gái", status: "resolved" },
      { personId: "chau-ho-nam", resolved: "cháu họ", status: "resolved" },
      { personId: "chau-ruot-khôi", resolved: "cháu ruột", status: "resolved" },
      { personId: "chau-ngoai-mai", resolved: "cháu ngoại", status: "resolved" },
      { personId: "chau-ho-tien", resolved: "cháu họ", status: "resolved" },
      { personId: "chau-ho-dat", resolved: "cháu họ", status: "resolved" },
      { personId: "chau-ho-ngoai-an", resolved: "cháu họ", status: "resolved" },
      { personId: "con-co-tuan", resolved: "anh/em họ", status: "resolved" },
      { personId: "con-co-lan", resolved: "chị/em họ", status: "resolved" },
    ],
  };
}

/** Stub PersonForm that shows a success message after "submit". */
function PrototypePersonForm(
  props: React.ComponentProps<typeof PersonForm>,
) {
  return <PersonForm {...props} />;
}

function PrototypeTreeContent() {
  const nextSearchParams = useSearchParams();
  const { showToast } = useToast();

  const [persons] = useState<Person[]>(MOCK_PERSONS);
  const [relationships] = useState<Relationship[]>(MOCK_RELATIONSHIPS);
  const [region, setRegionState] = useState<Region>("Bac");
  const [livingRedaction] = useState(false);
  const [sharing] = useState("private");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<
    Address | undefined
  >(undefined);
  const [addresses, setAddresses] = useState<Map<string, Address>>(new Map());
  const [selectedEgo, setSelectedEgo] = useState<Person | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addRelativeMode, setAddRelativeMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [egoId, setEgoId] = useState<string>("ego");
  const [addressLoading] = useState(false);
  const [addressRefreshKey, setAddressRefreshKey] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const handleDismissTutorial = () => setShowTutorial(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(
    () => nextSearchParams.get("panel") === "settings",
  );
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [showBirthYears, setShowBirthYears] = useState(true);

  const handleCloseCollaboration = () => {
    setIsCollaborationOpen(false);
  };

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const [collaborators, setCollaborators] = useState<any[]>([
    { id: "collab-1", userId: "contributor@example.com", role: "contributor", joinedAt: new Date().toISOString() }
  ]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([
    { id: "invite-1", email: "pending-contributor@example.com", code: "654321", status: "pending" }
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const newInvite = {
      id: `invite-${Date.now()}`,
      email: inviteEmail.trim(),
      code: "111222",
      status: "approved"
    };
    showToast(`Đã tạo lời mời email đã duyệt sẵn. Mã mời: ${newInvite.code}`, "success");
    setInviteEmail("");
  };

  const handleApproveInvite = (id: string) => {
    const invite = pendingInvites.find(i => i.id === id);
    if (!invite) return;
    setPendingInvites(prev => prev.filter(i => i.id !== id));
    setCollaborators(prev => [...prev, { id: `collab-${Date.now()}`, userId: invite.email, role: "contributor" }]);
    showToast("Bạn đã tham gia nhóm cộng tác xây dựng cây thành công!", "success");
  };

  const handleRejectInvite = (id: string) => {
    setPendingInvites(prev => prev.filter(i => i.id !== id));
    showToast("Đã từ chối lời mời cộng tác!", "success");
  };

  const handleJoinTree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    showToast("Đã tham gia nhóm cộng tác cây thành công!", "success");
    setInviteCode("");
  };

  const refreshTree = useCallback(() => {
    /* no-op in prototype */
  }, []);

  const handleAddressesLoaded = useCallback((loaded: Map<string, Address>) => {
    setAddresses(loaded);
  }, []);

  const selectedPerson = selectedId
    ? persons.find((p) => p.id === selectedId)
    : null;
  const isOwner = true; // always owner in prototype

  const personOptions = persons.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    gender: p.gender,
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

  const selectedSpouseRelationship = selectedPerson
    ? relationships.find((r) => r.type === "marriage" && (r.sourceId === selectedPerson.id || r.targetId === selectedPerson.id))
    : undefined;
  const selectedSpouseId = selectedSpouseRelationship && selectedPerson
    ? (selectedSpouseRelationship.sourceId === selectedPerson.id
      ? selectedSpouseRelationship.targetId
      : selectedSpouseRelationship.sourceId)
    : undefined;

  const isPanelOpen = !!(createMode || selectedPerson || addRelativeMode);

  return (
    /* ===== BEGIN: mirror of src/app/tree/page.tsx (populated branch) ===== */
    <section className="tree-workspace">
      <OnboardingModal isOpen={showTutorial} onClose={handleDismissTutorial} />

      <div className="tree-workspace__layout">
        {/* Floating Island Header/Toolbar */}
        <div className="tree-page-header">
          <div className="tree-page-header__row-one">
            {/* Brand — hidden on tablet/mobile via CSS */}
            <div className="tree-page-header__brand">
              <img src="/logo.svg" alt="Logo Cây Gia Phả" className="tree-page-header__logo" />
              <div className="tree-page-header__title-container">
                <h1 className="tree-page-header__title">Gia Phả Dòng Họ</h1>
                <span className="tree-page-header__count">{persons.length} thành viên</span>
              </div>
            </div>

            {/* Search — grows to fill space */}
            <div className="tree-page-header__search-container">
              <SearchPanel
                treeId={PROTOTYPE_TREE_ID}
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
            <div className="tree-page-header__viewpoint-inline">
              <ViewpointSelector
                persons={persons}
                egoId={egoId}
                onChange={setEgoId}
                disabled={addressLoading}
              />
            </div>

            {/* Actions */}
            <div className="tree-page-header__actions">
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
              {isOwner && (
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
                >
                  <PlusIcon size={18} />
                  <span className="hide-on-tablet hide-on-mobile">Thêm thành viên</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2 — viewpoint on tablet/mobile only (hidden on desktop via CSS) */}
          <div className="tree-page-header__row-two">
            <div className="tree-page-header__viewpoint">
              <ViewpointSelector
                persons={persons}
                egoId={egoId}
                onChange={setEgoId}
                disabled={addressLoading}
              />
            </div>
          </div>
        </div>

        {/* Left/Center: Main Graph */}
        <div className="tree-workspace__main">
          {/* Interactive SVG graph area */}
          <div className="tree-workspace__graph">
            <TreeGraph
              treeId={PROTOTYPE_TREE_ID}
              persons={persons}
              relationships={relationships}
              selectedId={selectedId}
              fetchAddresses={mockFetchAddresses}
              onSelectId={(id) => {
                setSelectedId(id);
                setEditMode(false);
                setAddRelativeMode(false);
                setCreateMode(false);
              }}
              onSelectAddress={setSelectedAddress}
              onSelectEgo={setSelectedEgo}
              egoId={egoId}
              onEgoChange={setEgoId}
              onAddressLoading={() => {}}
              onAddressesLoaded={handleAddressesLoaded}
              hideViewpointSelector={true}
              addressRefreshKey={addressRefreshKey}
              focusId={focusId}
              onFocusChange={setFocusId}
              showBirthYears={showBirthYears}
            />
          </div>
        </div>

        {/* Right Side: Member Details and Actions Panel */}
        <div className={`tree-workspace__info-panel ${isPanelOpen ? "tree-workspace__info-panel--open" : ""}`}>
          {createMode ? (
            <div className="surface-card side-panel" style={{ position: "relative" }}>
              <button
                type="button"
                className="side-panel__close"
                onClick={() => setCreateMode(false)}
                aria-label="Hủy"
                title="Hủy"
              >
                &times;
              </button>
              <h3 className="side-panel__title">Thêm thành viên mới</h3>
              <PrototypePersonForm
                mode="create"
                treeId={PROTOTYPE_TREE_ID}
                persons={personOptions}
                onSuccess={() => {
                  setCreateMode(false);
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
                title="Bỏ chọn"
              >
                &times;
                <span className="sr-only">Bỏ chọn</span>
              </button>

              {(editMode || addRelativeMode) && (
                <h3 className="side-panel__title">{selectedPerson.displayName}</h3>
              )}

              {editMode ? (
                <div>
                  <h4 style={{ margin: "1rem 0" }}>Chỉnh sửa thông tin</h4>
                  <PrototypePersonForm
                    mode="edit"
                    treeId={PROTOTYPE_TREE_ID}
                    personId={selectedPerson.id}
                    initialValues={selectedInitialValues}
                    spouseRelationship={selectedSpouseId ? {
                      spouseId: selectedSpouseId,
                      maritalStatus: selectedSpouseRelationship?.maritalStatus,
                    } : undefined}
                    onSuccess={() => {
                      setEditMode(false);
                    }}
                    onCancel={() => setEditMode(false)}
                    hideCancelButton={true}
                  />
                </div>
              ) : addRelativeMode ? (
                <div>
                  <h4 style={{ margin: "1rem 0" }}>
                    Thêm kết nối cho {selectedPerson.displayName}
                  </h4>
                  <AddRelativeForm
                    treeId={PROTOTYPE_TREE_ID}
                    persons={personOptions}
                    preselectedPersonId={selectedPerson.id}
                    onCreated={() => {
                      setAddRelativeMode(false);
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

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      marginTop: "1rem",
                    }}
                  >
                    {isOwner && (
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
                          treeId={PROTOTYPE_TREE_ID}
                          personId={selectedPerson.id}
                          triggerLabel="Xóa thành viên này"
                          className="btn-danger"
                          onDeleted={() => {
                            setSelectedId(null);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: "1.5rem",
                      borderTop: "1px solid var(--color-hairline-soft)",
                      paddingTop: "1rem",
                    }}
                  >
                    <PersonPhotos
                      treeId={PROTOTYPE_TREE_ID}
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
                title="Hủy"
              >
                &times;
              </button>
              <h3 className="side-panel__title">Thêm kết nối mới</h3>
              <AddRelativeForm
                treeId={PROTOTYPE_TREE_ID}
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
                <p
                  style={{
                    color: "var(--color-muted)",
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  Chọn một người để xem thông tin và cách xưng hô.
                </p>
              </div>
              <UpcomingEventsWidget treeId={PROTOTYPE_TREE_ID} />
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal (Cài đặt) */}
      <Modal isOpen={isSettingsOpen} onClose={handleCloseSettings} aria-label="Cài đặt">
        <ModalHeader title="Cài đặt" onClose={handleCloseSettings} />
        <ModalBody>
              {isOwner && (
                <section className="settings-section">
                  <h3>Cài đặt gia phả</h3>
                  <RegionSelector
                    treeId={PROTOTYPE_TREE_ID}
                    region={region}
                    onChange={(nextRegion) => {
                      setRegionState(nextRegion);
                      setAddressRefreshKey((k) => k + 1);
                    }}
                  />

                  <div className="field" style={{ marginTop: "1rem" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={livingRedaction}
                        readOnly
                      />
                      <span>Ẩn thông tin người còn sống</span>
                    </label>
                  </div>

                  <div className="field" style={{ marginTop: "1rem" }}>
                    <label htmlFor="proto-sharing-select">
                      Chế độ chia sẻ
                    </label>
                    <select
                      id="proto-sharing-select"
                      value={sharing}
                      onChange={() => { /* read-only in prototype */ }}
                      style={{ width: "100%", marginTop: "0.5rem" }}
                    >
                      <option value="private">Riêng tư (Private)</option>
                      <option value="link">
                        Bằng liên kết bí mật (Link)
                      </option>
                      <option value="public">
                        Công khai cho thành viên (Public)
                      </option>
                    </select>
                  </div>
                </section>
              )}



              <section
                className="settings-section"
                style={{
                  borderTop: "1px solid var(--color-hairline-soft)",
                  paddingTop: "1.5rem",
                  marginTop: "1.5rem",
                }}
              >
                <h3>Cài đặt hiển thị</h3>
                <TextSizeControl />

                <div className="field" style={{ marginTop: "1rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.95rem" }}>
                    <input
                      type="checkbox"
                      checked={showBirthYears}
                      onChange={(e) => setShowBirthYears(e.target.checked)}
                    />
                    <span>Hiển thị năm sinh/năm mất trực tiếp trên các node cây</span>
                  </label>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => {
                      setShowTutorial(true);
                      setIsSettingsOpen(false);
                    }}
                  >
                    📖 Xem lại hướng dẫn sử dụng
                  </button>
                </div>
              </section>

              <section
                className="settings-section"
                style={{
                  borderTop: "1px solid var(--color-hairline-soft)",
                  paddingTop: "1.5rem",
                  marginTop: "1.5rem",
                }}
              >
                <h3>Thông tin tài khoản</h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <span
                    className="settings-modal__user"
                    title={MOCK_USER.identifier}
                  >
                    Đã đăng nhập:{" "}
                    <strong>{MOCK_USER.identifier}</strong>
                  </span>
                  {/* SignOutButton omitted in prototype to avoid redirect */}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => showToast("[Prototype] Đăng xuất — no-op", "info")}
                  >
                    Đăng xuất
                  </button>
                </div>
              </section>
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={handleCloseSettings}>
            Đóng
          </button>
        </ModalFooter>
      </Modal>

      {/* Collaboration Modal (Cộng tác) */}
      <Modal isOpen={isCollaborationOpen} onClose={handleCloseCollaboration} aria-label="Quản lý cộng tác viên">
        <ModalHeader title="Quản lý cộng tác viên" onClose={handleCloseCollaboration} />
        <ModalBody>
          <section className="settings-section">
                <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>Thành viên hiện tại</h3>
                <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <Card style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--color-brand)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.9rem" }}>
                      C
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Chủ cây (Owner)</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>Quyền cao nhất</div>
                    </div>
                  </Card>
                  {collaborators.map((c) => (
                    <Card key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "var(--color-surface-hover)", color: "var(--color-fg)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.9rem" }}>
                        {c.userId.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{c.userId}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--color-muted)", display: "flex", gap: "0.5rem", marginTop: "0.2rem" }}>
                          {c.role === "owner" ? <Badge variant="brand">Chủ cây</Badge> : <Badge variant="neutral">Cộng tác viên</Badge>}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <form onSubmit={handleSendInvite} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem", borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1.5rem" }}>
                  <label htmlFor="invite-email" style={{ fontWeight: "bold" }}>Thêm cộng tác viên mới</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                      required
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-secondary">Mời</button>
                  </div>
                </form>

                {isOwner && pendingInvites.length > 0 && (
                  <div style={{ marginBottom: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--color-hairline-soft)" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--color-danger)" }}>Đang chờ duyệt ({pendingInvites.length} yêu cầu):</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {pendingInvites.map((invite) => (
                        <Card key={invite.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", borderLeftWidth: "4px", borderLeftColor: "var(--color-danger)" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{invite.email}</span>
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button type="button" className="btn" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleApproveInvite(invite.id)}>Duyệt</button>
                            <button type="button" className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleRejectInvite(invite.id)}>Từ chối</button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleJoinTree} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px dashed var(--color-hairline-soft)", paddingTop: "1.5rem" }}>
                  <label htmlFor="invite-code" style={{ fontWeight: "bold" }}>Tham gia gia phả bằng mã mời</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Input
                      id="invite-code"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Nhập mã 6 chữ số"
                      maxLength={6}
                      required
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-secondary">Tham gia</button>
                  </div>
                </form>
              </section>
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={handleCloseCollaboration}>
            Đóng
          </button>
        </ModalFooter>
      </Modal>
    </section>
    /* ===== END: mirror of src/app/tree/page.tsx (populated branch) ===== */
  );
}

export default function PrototypeTreePage() {
  return (
    <MockSessionProvider>
      <Suspense>
        <PrototypeTreeContent />
      </Suspense>
    </MockSessionProvider>
  );
}
