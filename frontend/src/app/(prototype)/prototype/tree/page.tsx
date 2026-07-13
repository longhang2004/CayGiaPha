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
import { CollaborationModal, type CollaborationAdapter } from "@/components/collaboration/CollaborationModal";
import { SettingsModal } from "@/components/tree/SettingsModal";
import { GraphOverlayBoundary } from "@/components/guidance/GraphOverlayBoundary";
import { GuidanceOrchestrator } from "@/components/guidance/GuidanceOrchestrator";

import { TreeContext, type TreeContextType } from "@/components/tree-page/TreeContext";
import { TreePageHeader } from "@/components/tree-page/TreePageHeader";
import { TreePageSlidePanel } from "@/components/tree-page/TreePageSlidePanel";

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
      { personId: "chau-ho-tuan", resolved: "cháu họ", status: "resolved" },
      { personId: "chau-ho-linh", resolved: "cháu họ", status: "resolved" },
    ],
  };
}

function PrototypeTreeContent() {
  const searchParams = useSearchParams();
  const guidanceRole = searchParams.get("role") === "reader" ? "reader" : searchParams.get("role") === "editor" ? "editor" : "owner";
  const guideState = searchParams.get("guide");
  const [persons] = useState<Person[]>(MOCK_PERSONS);
  const [relationships] = useState<Relationship[]>(MOCK_RELATIONSHIPS);
  const [region, setRegionState] = useState<Region>("Bac");
  const [livingRedaction, setLivingRedaction] = useState(false);
  const [sharing, setSharing] = useState("private");
  const [treeName, setTreeName] = useState("Cây Gia Phả Mẫu");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | undefined>(undefined);
  const [addresses, setAddresses] = useState<Map<string, Address>>(new Map());
  const [selectedEgo, setSelectedEgo] = useState<Person | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [addRelativeMode, setAddRelativeMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);

  const [addressLoading, setAddressLoading] = useState(false);
  const [egoId, setEgoId] = useState<string>(MOCK_PERSONS[0].id);
  const [addressRefreshKey, setAddressRefreshKey] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);

  const [shareToken, setShareToken] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [showBirthYears, setShowBirthYears] = useState(true);
  const [collaborators, setCollaborators] = useState<TreeCollaborator[]>([]);

  const handleAddressesLoaded = useCallback((loaded: Map<string, Address>) => {
    setAddresses(loaded);
  }, []);

  const refreshTree = useCallback(() => {
    /* no-op in prototype */
  }, []);

  useEffect(() => {
    if (searchParams.get("panel") === "settings") {
      setIsSettingsOpen(true);
    }
  }, [searchParams]);

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

  const primitiveCount = relationships.filter((relationship) => relationship.type === "bloodline_father" || relationship.type === "bloodline_mother" || relationship.type === "marriage").length;
  const addressesReady = true;

  const guidanceProductState = {
    treeOpened: true,
    personCount: persons.length,
    primitiveCount,
    addressInspected: Boolean(selectedId && addressesReady && (selectedAddress || addresses.has(selectedId))),
    viewpointChanged: Boolean(egoId && egoId !== persons[0]?.id && addressesReady),
  };

  const treeState: TreeContextType = {
    activeTreeId: PROTOTYPE_TREE_ID,
    shareToken,
    accessRole: "OWNER",
    capabilities: {
      editContent: true,
      editPhotos: true,
      editVisibility: true,
      manageClaim: true,
      manageTree: true,
      manageCollaboration: true,
    },
    claimInviteAction: async () => {},
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
    addressesReady: true,
    addressLoading,
    error: null,
    egoId,
    selectedId,
    selectedAddress,
    selectedEgo,
    focusId,
    addressRefreshKey,
    editMode,
    addRelativeMode,
    createMode,
    isSettingsOpen,
    isCollaborationOpen,
    isOwner: true,
    isCollaborator: false,
    canEdit: true,
    guidanceRole,
    setEgoId,
    setSelectedId,
    setSelectedAddress,
    setSelectedEgo,
    setFocusId,
    setEditMode,
    setAddRelativeMode,
    setCreateMode,
    setIsSettingsOpen,
    setIsCollaborationOpen,
    setAddressLoading,
    handleAddressesLoaded,
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
            productState={guidanceProductState}
            contextualTopicId={selectedId ? "doi-diem-nhin" : "dieu-huong-so-do"}
            initialTourTopicId={guideState === "tour" || guideState === "tour-missing" ? "doi-diem-nhin" : null}
            tourAnchorOverride={guideState === "tour-missing" ? "missing-anchor" : undefined}
            initialChecklistPresentation={guideState === "collapsed" ? "collapsed" : guideState === "deferred" ? "deferred" : "expanded"}
          />}
        >

          <TreePageHeader />

          <div className="tree-workspace__main">
            <div className="tree-workspace__graph">
              <TreeGraph
                treeId={PROTOTYPE_TREE_ID}
                persons={persons}
                relationships={relationships}
                selectedId={selectedId}
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
                onAddressLoading={setAddressLoading}
                onAddressesLoaded={handleAddressesLoaded}
                hideViewpointSelector={true}
                addressRefreshKey={addressRefreshKey}
                fetchAddresses={mockFetchAddresses}
                focusId={focusId}
                onFocusChange={setFocusId}
                showBirthYears={showBirthYears}
              />
            </div>
          </div>

          <TreePageSlidePanel />
        </GraphOverlayBoundary>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={handleCloseSettings}
          treeId={PROTOTYPE_TREE_ID}
          isOwner={true}
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

        <CollaborationModal
          isOpen={isCollaborationOpen}
          onClose={handleCloseCollaboration}
          treeId={PROTOTYPE_TREE_ID}
          isOwner={true}
          adapter={mockAdapter}
          isPrototype={true}
        />
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
