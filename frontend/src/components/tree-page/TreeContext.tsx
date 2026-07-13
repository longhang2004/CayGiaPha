import { createContext, useContext } from "react";
import type { Person, Relationship, Address, Capabilities, TreeAccessRole } from "@/lib/graph";
import type { Region } from "@/lib/region";
import type { TreeCollaborator } from "@/lib/collaboration";

export interface TreeContextType {
  activeTreeId: string;
  shareToken: string | null;

  // Data
  persons: Person[];
  relationships: Relationship[];
  addresses: Map<string, Address>;
  collaborators: TreeCollaborator[];

  // Tree Settings
  treeName: string;
  region: Region;
  livingRedaction: boolean;
  sharing: string;
  showBirthYears: boolean;

  // Loading & Error
  loadingData: boolean;
  addressesReady: boolean;
  addressLoading: boolean;
  error: string | null;

  // Current View State
  egoId: string;
  selectedId: string | null;
  selectedAddress: Address | undefined;
  selectedEgo: Person | null;
  focusId: string | null;
  addressRefreshKey: number;

  // Modals & Panels State
  editMode: boolean;
  addRelativeMode: boolean;
  createMode: boolean;
  isSettingsOpen: boolean;
  isCollaborationOpen: boolean;

  // Permissions & Roles
  accessRole: TreeAccessRole;
  capabilities: Capabilities;
  isOwner: boolean;
  isCollaborator: boolean;
  canEdit: boolean;
  guidanceRole: "owner" | "editor" | "reader";

  // Actions
  setEgoId: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedAddress: (addr: Address | undefined) => void;
  setSelectedEgo: (person: Person | null) => void;
  setFocusId: (id: string | null) => void;
  setEditMode: (mode: boolean) => void;
  setAddRelativeMode: (mode: boolean) => void;
  setCreateMode: (mode: boolean) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsCollaborationOpen: (open: boolean) => void;
  setAddressLoading: (loading: boolean) => void;
  handleAddressesLoaded: (loaded: Map<string, Address>) => void;
  refreshTree: () => void;
  claimInviteAction?: (destination: string) => Promise<void>;

  // Settings Actions
  setTreeName: (name: string) => void;
  setRegionState: (region: Region) => void;
  setLivingRedaction: (enabled: boolean) => void;
  setSharing: (sharing: string) => void;
  setShareToken: (token: string | null) => void;
  setShowBirthYears: (show: boolean) => void;
  setAddressRefreshKey: (updater: (key: number) => number) => void;
}

export const TreeContext = createContext<TreeContextType | null>(null);

export function useTreeContext() {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error("useTreeContext must be used within a TreeProvider");
  }
  return context;
}
