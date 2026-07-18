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
 *  - `fetchAddresses` derives mock regional terms locally, avoiding backend calls.
 *  - Accepts `?panel=settings` to open the settings modal by default.
 *  - Accepts `?graphStress=1` for long-name and combined-status graph regression checks.
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
import type { Person, Relationship, Capabilities, TreeAccessRole } from "@/lib/graph";
import type { Region } from "@/lib/region";
import type { TreeCollaborator, CollaborationInvitation } from "@/lib/collaboration";
import { MockSessionProvider } from "@/lib/prototype/mockSession";
import {
  MOCK_PERSONS,
  MOCK_RELATIONSHIPS,
  PROTOTYPE_TREE_ID,
  MOCK_USER,
} from "@/lib/prototype/mockData";
import { buildMockViewpointAddresses } from "@/lib/prototype/mockAddresses";
import "@/components/graph/graph.css";
import { CollaborationModal, type CollaborationAdapter } from "@/components/collaboration/CollaborationModal";
import { SettingsModal } from "@/components/tree/SettingsModal";
import { GraphOverlayBoundary } from "@/components/guidance/GraphOverlayBoundary";
import { GuidanceOrchestrator } from "@/components/guidance/GuidanceOrchestrator";

import { TreeContext, type TreeContextType } from "@/components/tree-page/TreeContext";
import { TreePageHeader } from "@/components/tree-page/TreePageHeader";
import { TreePageSlidePanel } from "@/components/tree-page/TreePageSlidePanel";
import { useViewpointAddresses } from "@/components/tree-page/useViewpointAddresses";
import { TreeWorkspaceSurface } from "@/components/tree-page/TreeWorkspaceSurface";
import { usePersonPanelController } from "@/components/tree-page/usePersonPanelController";

const NO_CAPABILITIES: Capabilities = {
  editContent: false,
  editRelationships: false,
  editPhotos: false,
  editVisibility: false,
  manageClaim: false,
  manageTree: false,
  manageCollaboration: false,
};

function prototypeCapabilities(role: TreeAccessRole, personScoped = false): Capabilities {
  if (role === "OWNER") {
    return {
      editContent: true,
      editRelationships: true,
      editPhotos: true,
      editVisibility: true,
      manageClaim: true,
      manageTree: true,
      manageCollaboration: true,
    };
  }
  if (role === "CONTRIBUTOR") {
    return { ...NO_CAPABILITIES, editContent: true, editRelationships: true, editPhotos: true };
  }
  if (role === "LINKED" && personScoped) {
    return { ...NO_CAPABILITIES, editContent: true, editPhotos: true, editVisibility: true };
  }
  return { ...NO_CAPABILITIES };
}

function PrototypeTreeContent() {
  const searchParams = useSearchParams();
  const requestedRole = searchParams.get("role");
  const accessRole: TreeAccessRole = requestedRole === "contributor" || requestedRole === "editor"
    ? "CONTRIBUTOR"
    : requestedRole === "linked"
      ? "LINKED"
      : requestedRole === "reader"
        ? "READER"
        : "OWNER";
  const capabilities = useMemo(() => prototypeCapabilities(accessRole), [accessRole]);
  const guidanceRole = accessRole === "OWNER" ? "owner" : accessRole === "CONTRIBUTOR" ? "editor" : "reader";
  const guideState = searchParams.get("guideState");
  const graphStress = searchParams.get("graphStress") === "1";
  const persons = useMemo<Person[]>(() => MOCK_PERSONS.map((person) => {
    const stressedPerson = graphStress && person.id === "ego"
      ? {
          ...person,
          displayName: "Hàng Nhựt Long Gia Đình Nhánh Chính Nhiều Thế Hệ",
          claimed: true,
        }
      : graphStress && person.id === "duong"
        ? {
            ...person,
            displayName: "Nguyễn Văn Hùng Gia Đình Nhánh Mở Rộng Nhiều Thế Hệ",
            claimed: true,
            deceased: true,
          }
        : person;

    return {
      ...stressedPerson,
      capabilities: accessRole === "LINKED"
        ? prototypeCapabilities(accessRole, person.id === "ego")
        : capabilities,
    };
  }), [accessRole, capabilities, graphStress]);
  const [relationships] = useState<Relationship[]>(MOCK_RELATIONSHIPS);
  const [region, setRegionState] = useState<Region>("Nam");
  const [livingRedaction, setLivingRedaction] = useState(false);
  const [sharing, setSharing] = useState("private");
  const [treeName, setTreeName] = useState("Cây Gia Phả Mẫu");

  const {
    selectedId,
    personPanelMode,
    selectPerson,
    openPersonPanel,
    backPersonPanel,
    closePersonPanel,
    showCreatedPerson,
  } = usePersonPanelController();

  const [egoId, setEgoId] = useState<string>("ego");
  const [addressRefreshKey, setAddressRefreshKey] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  const fetchPrototypeAddresses = useCallback(
    async (_treeId: string, viewpointId: string) =>
      buildMockViewpointAddresses(viewpointId, region),
    [region],
  );

  const { addresses, loading: addressLoading, ready: addressesReady, error: addressError } = useViewpointAddresses({
    treeId: PROTOTYPE_TREE_ID,
    egoId,
    persons,
    relationships,
    refreshKey: addressRefreshKey,
    fetchAddresses: fetchPrototypeAddresses,
  });

  const selectedAddress = selectedId ? addresses.get(selectedId) : undefined;
  const selectedEgo = egoId ? persons.find((p) => p.id === egoId) || null : null;

  const [shareToken, setShareToken] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [showBirthYears, setShowBirthYears] = useState(true);
  const [collaborators, setCollaborators] = useState<TreeCollaborator[]>([]);

  const refreshTree = useCallback(() => {
    /* no-op in prototype */
  }, []);

  useEffect(() => {
    if (searchParams.get("panel") === "settings") {
      setIsSettingsOpen(true);
    }
    const requestedPerson = searchParams.get("person");
    if (requestedPerson && persons.some((person) => person.id === requestedPerson)) {
      selectPerson(requestedPerson);
    }
  }, [persons, searchParams, selectPerson]);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleCloseCollaboration = useCallback(() => {
    setIsCollaborationOpen(false);
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
      createInviteLink: async (treeId: string) => { await wait(); return { id: "prototype-share-invite", code: "999888" }; },
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

  const treeState: TreeContextType = {
    activeTreeId: PROTOTYPE_TREE_ID,
    shareToken,
    accessRole,
    capabilities,
    claimInviteAction: async () => {},
    upcomingEventsLoader: async () => {
      const today = new Date();
      const eventDate = new Date(today);
      eventDate.setDate(today.getDate() + 2);
      return [{
        personId: "ong-noi",
        displayName: "Hàng Hữu Thiền",
        relationship: "Ông nội",
        eventType: "death_anniversary",
        eventDate: eventDate.toISOString().slice(0, 10),
        originalDate: "Ngày 12 tháng 3 Âm lịch",
        daysRemaining: 2,
      }];
    },
    persons,
    relationships,
    addresses,
    collaborators,
    treeName,
    region,
    livingRedaction,
    sharing,
    showBirthYears,
    loadingData: false,
    addressesReady,
    addressLoading,
    error: null,
    addressError,
    egoId,
    selectedId,
    selectedAddress,
    selectedEgo,
    focusId,
    addressRefreshKey,
    personPanelMode,
    isSettingsOpen,
    isCollaborationOpen,
    isOwner: accessRole === "OWNER",
    isCollaborator: accessRole === "CONTRIBUTOR",
    canEdit: capabilities.editContent,
    guidanceRole,
    setEgoId,
    selectPerson,
    openPersonPanel,
    backPersonPanel,
    closePersonPanel,
    showCreatedPerson,
    setFocusId,
    setIsSettingsOpen,
    setIsCollaborationOpen,
    refreshTree,
    setTreeName,
    setRegionState,
    setLivingRedaction,
    setSharing,
    setShareToken,
    setShowBirthYears,
    setAddressRefreshKey,
  };

  return (
    <TreeContext.Provider value={treeState}>
      {/* ===== BEGIN: mirror of src/app/tree/page.tsx (populated branch) ===== */}
      <section className="tree-workspace">
        <GraphOverlayBoundary
          className="tree-workspace__layout"
          overlay={<GuidanceOrchestrator
            role={guidanceRole}
            initialTourTopicId={guideState === "tour" || guideState === "tour-missing" ? "doi-diem-nhin" : null}
            tourAnchorOverride={guideState === "tour-missing" ? "missing-anchor" : undefined}
            helpHref="/prototype/help"
          />}
        >

          <div className="tree-workspace__main">
            <TreePageHeader treeListHref="/prototype/tree-list" helpHref="/prototype/help" />
            <TreeWorkspaceSurface
              persons={persons}
              relationships={relationships}
              addresses={addresses}
              egoId={egoId}
              selectedId={selectedId}
              accessRole={accessRole}
              onSelectPerson={(id, opener) => selectPerson(id, opener)}
              graphContent={
                <div className="tree-workspace__graph">
                  <TreeGraph
                    treeId={PROTOTYPE_TREE_ID}
                    persons={persons}
                    relationships={relationships}
                    selectedId={selectedId}
                    onSelectId={(id) => id ? selectPerson(id) : closePersonPanel()}
                    egoId={egoId}
                    onEgoChange={setEgoId}
                    addresses={addresses}
                    addressLoading={addressLoading}
                    addressError={addressError}
                    hideViewpointSelector={true}
                    addressRefreshKey={addressRefreshKey}
                    focusId={focusId}
                    onFocusChange={setFocusId}
                    showBirthYears={showBirthYears}
                    helpHref="/prototype/help"
                  />
                </div>
              }
            />
          </div>

          <TreePageSlidePanel />
        </GraphOverlayBoundary>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={handleCloseSettings}
          treeId={PROTOTYPE_TREE_ID}
          isOwner={capabilities.manageTree}
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
          isPrototype={true}
        />

        {capabilities.manageCollaboration ? (
          <CollaborationModal
            isOpen={isCollaborationOpen}
            onClose={handleCloseCollaboration}
            treeId={PROTOTYPE_TREE_ID}
            isOwner={capabilities.manageCollaboration}
            adapter={mockAdapter}
            isPrototype={true}
          />
        ) : null}
      </section>
      {/* ===== END: mirror of src/app/tree/page.tsx (populated branch) ===== */}
    </TreeContext.Provider>
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
