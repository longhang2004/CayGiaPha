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
import { LightbulbIcon } from "@/components/ui/Icons";
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
  return (
    <div>
      <div
        style={{
          padding: "0.75rem",
          background: "var(--color-surface-alt, #f3f4f6)",
          borderRadius: "var(--radius-sm, 0.25rem)",
          fontSize: "0.875rem",
          color: "var(--color-muted)",
          marginBottom: "1rem",
        }}
      >
        📋 Prototype: biểu mẫu PersonForm — gọi API thật sẽ bị chặn.
      </div>
      <PersonForm {...props} />
    </div>
  );
}

function PrototypeTreeContent() {
  const nextSearchParams = useSearchParams();

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
  const [overflowOpen, setOverflowOpen] = useState(false);
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
      status: "pending"
    };
    setPendingInvites(prev => [...prev, newInvite]);
    alert("Đã tạo lời mời cộng tác thành công (đang chờ duyệt)!");
    setInviteEmail("");
  };

  const handleApproveInvite = (id: string) => {
    const invite = pendingInvites.find(i => i.id === id);
    if (!invite) return;
    setPendingInvites(prev => prev.filter(i => i.id !== id));
    setCollaborators(prev => [...prev, { id: `collab-${Date.now()}`, userId: invite.email, role: "contributor" }]);
    alert("Đã duyệt cộng tác viên thành công!");
  };

  const handleRejectInvite = (id: string) => {
    setPendingInvites(prev => prev.filter(i => i.id !== id));
    alert("Đã từ chối lời mời cộng tác!");
  };

  const handleJoinTree = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    alert("Đã tham gia nhóm cộng tác cây thành công!");
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
        visibility: {
          visMarital: "private" as const,
          visAdoption: "private" as const,
          visDeath: "private" as const,
          visName: "public" as const,
          visBirthYear: "public" as const,
          visPhoto: "private" as const,
        },
      }
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
            <div className="tree-page-header__brand">
              <img src="/logo.png" alt="Logo Cây Gia Phả" className="tree-page-header__logo" />
              <div className="tree-page-header__title-container">
                <h1 className="tree-page-header__title">Gia Phả Dòng Họ</h1>
                <span className="tree-page-header__count">{persons.length} thành viên</span>
              </div>
            </div>

            <div className="tree-page-header__row-one-right">
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
              <div className="tree-page-header__actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCollaborationOpen(true)}
                >
                  👥 <span>Cộng tác</span>
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
                  >
                    ➕ <span>Thêm thành viên</span>
                  </button>
                )}
              </div>
            </div>
          </div>

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
                aria-label="Hủy bỏ"
                title="Hủy bỏ"
              >
                &times;
              </button>
              <h3 className="side-panel__title">Tạo thành viên mới</h3>
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
                  <h4 style={{ margin: "1rem 0" }}>Sửa thông tin</h4>
                  <PrototypePersonForm
                    mode="edit"
                    treeId={PROTOTYPE_TREE_ID}
                    personId={selectedPerson.id}
                    initialValues={selectedInitialValues}
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
                    Thêm quan hệ cho {selectedPerson.displayName}
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
                          Sửa thông tin
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
                          onClick={() => setFocusId(focusId === selectedPerson.id ? null : selectedPerson.id)}
                          style={focusId === selectedPerson.id ? { border: "1px solid var(--color-brand)" } : undefined}
                        >
                          {focusId === selectedPerson.id ? "✕ Toàn bộ cây" : "👁 Xem riêng"}
                        </button>

                        {/* Overflow menu */}
                        <div
                          className="person-actions__overflow"
                          style={{ position: "relative" }}
                        >
                          <button
                            type="button"
                            className="btn btn-secondary"
                            aria-label="Thêm tùy chọn"
                            aria-expanded={overflowOpen}
                            onClick={() => setOverflowOpen((v) => !v)}
                          >
                            ···
                          </button>
                          {overflowOpen && (
                            <div
                              className="person-actions__overflow-menu"
                              role="menu"
                            >
                              <DeletionDialog
                                treeId={PROTOTYPE_TREE_ID}
                                personId={selectedPerson.id}
                                triggerLabel="Xóa thành viên này"
                                className="person-actions__overflow-item person-actions__overflow-item--danger"
                                onDeleted={() => {
                                  setOverflowOpen(false);
                                  setSelectedId(null);
                                }}
                              />
                            </div>
                          )}
                        </div>
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
                aria-label="Hủy bỏ"
                title="Hủy bỏ"
              >
                &times;
              </button>
              <h3 className="side-panel__title">Thêm quan hệ mới</h3>
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
      {isSettingsOpen && (
        <div className="settings-modal-overlay" onClick={handleCloseSettings}>
          <div
            className="settings-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-modal__header">
              <h2>Cài đặt</h2>
              <button
                type="button"
                className="settings-modal__close"
                onClick={handleCloseSettings}
                aria-label="Đóng cài đặt"
              >
                &times;
              </button>
            </div>
            <div className="settings-modal__body">
              {isOwner && (
                <section className="settings-section">
                  <h3>Cấu hình dòng họ</h3>
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
                    onClick={() => alert("[Prototype] Đăng xuất — no-op")}
                  >
                    Đăng xuất
                  </button>
                </div>
              </section>
            </div>
            <div
              className="settings-modal__footer"
              style={{
                borderTop: "1px solid var(--color-hairline-soft)",
                paddingTop: "1rem",
                marginTop: "1rem",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseSettings}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collaboration Modal (Cộng tác) */}
      {isCollaborationOpen && (
        <div className="settings-modal-overlay" onClick={handleCloseCollaboration}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal__header">
              <h2>Cộng tác xây dựng cây</h2>
              <button
                type="button"
                className="settings-modal__close"
                onClick={handleCloseCollaboration}
                aria-label="Đóng cửa sổ cộng tác"
              >
                &times;
              </button>
            </div>
            <div className="settings-modal__body">
              <section className="settings-section">
                <h3>Thành viên tham gia xây dựng cây</h3>
                <div style={{ marginBottom: "1.5rem" }}>
                  <ul style={{ paddingLeft: "1.2rem", margin: "0.5rem 0", lineHeight: "1.6" }}>
                    <li>
                      Chủ cây (Owner)
                    </li>
                    {collaborators.map((c) => (
                      <li key={c.id}>
                        {c.userId} ({c.role === "owner" ? "Chủ cây" : "Cộng tác viên"})
                      </li>
                    ))}
                  </ul>
                </div>

                <form onSubmit={handleSendInvite} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem", borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1.5rem" }}>
                  <label htmlFor="invite-email" style={{ fontWeight: "bold" }}>Mời người khác qua email:</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                      required
                      style={{ flex: 1, padding: "0.4rem 0.6rem" }}
                    />
                    <button type="submit" className="btn btn-secondary">Mời</button>
                  </div>
                </form>

                {pendingInvites.length > 0 && (
                  <div style={{ marginBottom: "1.5rem", border: "1px solid var(--color-hairline-soft)", padding: "0.75rem", borderRadius: "4px" }}>
                    <label style={{ fontWeight: "bold", color: "var(--color-danger)" }}>Yêu cầu mời đang chờ duyệt ({pendingInvites.length}):</label>
                    <ul style={{ listStyle: "none", padding: 0, margin: "0.5rem 0" }}>
                      {pendingInvites.map((invite) => (
                        <li key={invite.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <span style={{ fontSize: "0.85rem" }}>{invite.email}</span>
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button type="button" className="btn" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleApproveInvite(invite.id)}>Duyệt</button>
                            <button type="button" className="btn btn-secondary" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleRejectInvite(invite.id)}>Từ chối</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <form onSubmit={handleJoinTree} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", borderTop: "1px dashed var(--color-hairline-soft)", paddingTop: "1.5rem" }}>
                  <label htmlFor="invite-code" style={{ fontWeight: "bold" }}>Nhập mã mời để tham gia cây khác:</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      id="invite-code"
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Mã 6 số"
                      maxLength={6}
                      required
                      style={{ flex: 1, padding: "0.4rem 0.6rem" }}
                    />
                    <button type="submit" className="btn btn-secondary">Tham gia</button>
                  </div>
                </form>
              </section>
            </div>
            <div className="settings-modal__footer" style={{ borderTop: "1px solid var(--color-hairline-soft)", paddingTop: "1rem", marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={handleCloseCollaboration}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
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
