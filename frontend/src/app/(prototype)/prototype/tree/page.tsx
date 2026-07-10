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

import React, { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { TreeGraph } from "@/components/graph/TreeGraph";
import { useToast } from "@/components/ui/ToastProvider";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/FormControls";
import { GraphLegend } from "@/components/graph/GraphLegend";
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
import type { TreeCollaborator, CollaborationInvitation } from "@/lib/collaboration";
import { MockSessionProvider } from "@/lib/prototype/mockSession";
import {
  MOCK_PERSONS,
  MOCK_RELATIONSHIPS,
  PROTOTYPE_TREE_ID,
  MOCK_USER,
} from "@/lib/prototype/mockData";
import "@/components/graph/graph.css";
import { CollaborationIcon, PlusIcon, CloseIcon } from "@/components/ui/Icons";
import { CollaborationModal, type CollaborationAdapter } from "@/components/collaboration/CollaborationModal";
import { SettingsModal } from "@/components/tree/SettingsModal";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { TreeWorkspaceTour } from "@/components/onboarding/TreeWorkspaceTour";

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
  const [livingRedaction, setLivingRedaction] = useState(false);
  const [sharing, setSharing] = useState("private");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [treeName, setTreeName] = useState("Gia phả dòng họ");

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

  const mockAdapter = useMemo<CollaborationAdapter>(() => {
    let mockCollaborators: TreeCollaborator[] = [
      { id: "owner:prototype-tree-id-0001", treeId: PROTOTYPE_TREE_ID, userId: MOCK_USER.userId, displayName: MOCK_USER.displayName, email: MOCK_USER.identifier, role: "owner", joinedAt: new Date().toISOString() },
      { id: "collab-1", treeId: PROTOTYPE_TREE_ID, userId: "prototype-contributor-id", displayName: "Nguyễn Văn A", email: "contributor@example.test", role: "contributor", joinedAt: new Date().toISOString() }
    ];
    let mockPendingInvites: CollaborationInvitation[] = [
      { id: "invite-1", treeId: PROTOTYPE_TREE_ID, inviterUserId: "system", email: "pending-contributor@example.com", code: "654321", status: "pending", expiresAt: new Date(Date.now() + 86400000).toISOString() }
    ];

    const wait = () => new Promise((resolve) => window.setTimeout(resolve, 350));

    return {
      getCollaborators: async () => { await wait(); return mockCollaborators; },
      getPendingInvitations: async () => { await wait(); return mockPendingInvites; },
      inviteCollaborator: async (treeId: string, email: string) => {
        await wait();
        return { status: "approved", code: "111222", emailMessage: `Đã gửi lời mời tới ${email}` };
      },
      createInviteLink: async (treeId: string) => { await wait(); return { code: "999888" }; },
      approveInvitation: async (treeId: string, inviteId: string) => {
        await wait();
        const invite = mockPendingInvites.find(i => i.id === inviteId);
        if (invite) {
          mockPendingInvites = mockPendingInvites.filter(i => i.id !== inviteId);
          mockCollaborators = [...mockCollaborators, { id: `collab-${Date.now()}`, treeId, userId: "prototype-approved-user", displayName: null, email: invite.email, role: "contributor", joinedAt: new Date().toISOString() }];
        }
      },
      rejectInvitation: async (treeId: string, inviteId: string) => {
        await wait();
        mockPendingInvites = mockPendingInvites.filter(i => i.id !== inviteId);
      },
      joinTreeGroup: async (code: string) => {
        await wait();
        return {
          id: `invite-${Date.now()}`,
          treeId: PROTOTYPE_TREE_ID,
          inviterUserId: "system",
          email: null,
          code,
          status: "pending",
          expiresAt: new Date(Date.now() + 86400000).toISOString()
        } as any;
      }
    };
  }, []);

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
        <TreeWorkspaceTour storageKey="prototype_tree_workspace_tour_seen_v1" />

        {/* Floating Island Header/Toolbar */}
        <div className="tree-page-header">
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
              <GraphLegend />
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
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        treeId={PROTOTYPE_TREE_ID}
        isOwner={isOwner}
        treeName={treeName}
        region={region}
        livingRedaction={livingRedaction}
        sharing={sharing}
        shareToken={shareToken}
        showBirthYears={showBirthYears}
        onTreeNameChange={setTreeName}
        onRegionChange={(newRegion) => {
          setRegionState(newRegion);
          setAddressRefreshKey((k) => k + 1);
        }}
        onLivingRedactionChange={setLivingRedaction}
        onSharingChange={(mode, token) => {
          setSharing(mode);
          setShareToken(token);
        }}
        onShowBirthYearsChange={setShowBirthYears}
        onShowTutorial={() => setShowTutorial(true)}
        isPrototype={true}
      />

      {/* Collaboration Modal (Cộng tác) */}
      <CollaborationModal
        isOpen={isCollaborationOpen}
        onClose={handleCloseCollaboration}
        treeId={PROTOTYPE_TREE_ID}
        isOwner={isOwner}
        adapter={mockAdapter}
        isPrototype={true}
      />
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
