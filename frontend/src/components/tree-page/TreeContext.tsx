import { createContext, useContext } from "react";
import type { Person, Relationship, Address, Capabilities, TreeAccessRole } from "@/lib/graph";
import type { Region } from "@/lib/region";
import type { TreeCollaborator } from "@/lib/collaboration";
import type { UpcomingEvent } from "@/lib/persons";
import type { PersonPanelMode } from "./personPanelState";

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
  addressError: string | null;

  // Modals & Panels State
  personPanelMode: PersonPanelMode;
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
  selectPerson: (id: string, opener?: HTMLElement | null) => void;
  openPersonPanel: (
    id: string,
    mode: Exclude<PersonPanelMode, "view">,
    opener?: HTMLElement | null,
  ) => void;
  backPersonPanel: () => void;
  closePersonPanel: () => void;
  showCreatedPerson: (id: string) => void;
  setFocusId: (id: string | null) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setIsCollaborationOpen: (open: boolean) => void;
  refreshTree: () => void;
  claimInviteAction?: (destination: string) => Promise<void>;
  upcomingEventsLoader?: (treeId: string) => Promise<UpcomingEvent[]>;

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
