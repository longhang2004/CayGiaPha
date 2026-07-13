import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { api, ApiError } from "@/lib/apiClient";
import type { Person, Relationship, Address, Capabilities, TreeAccessRole } from "@/lib/graph";
import type { Region } from "@/lib/region";
import { getCollaborators, type TreeCollaborator } from "@/lib/collaboration";
import type { TreeContextType } from "./TreeContext";

export function useTreePageState(
  activeTreeId: string,
  initialShareToken: string | null
): TreeContextType & {
  isSessionOrDataLoading: boolean;
  showLoadingOverlay: boolean;
} {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [region, setRegionState] = useState<Region>("Bac");
  const [livingRedaction, setLivingRedaction] = useState(true);
  const [sharing, setSharing] = useState("private");
  const [treeName, setTreeName] = useState("Cây Gia Phả");
  const [accessRole, setAccessRole] = useState<TreeAccessRole>("NONE");
  const [capabilities, setCapabilities] = useState<Capabilities>({
    editContent: false,
    editPhotos: false,
    editVisibility: false,
    manageClaim: false,
    manageTree: false,
    manageCollaboration: false,
  });

  const [loadingData, setLoadingData] = useState(true);
  const [addressesReady, setAddressesReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<Address | undefined>(undefined);
  const [addresses, setAddresses] = useState<Map<string, Address>>(new Map());
  const [selectedEgo, setSelectedEgo] = useState<Person | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addRelativeMode, setAddRelativeMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);

  const [addressLoading, setAddressLoading] = useState(false);
  const [egoId, setEgoId] = useState<string>("");
  const [addressRefreshKey, setAddressRefreshKey] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);

  const [shareToken, setShareToken] = useState<string | null>(initialShareToken);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollaborationOpen, setIsCollaborationOpen] = useState(false);
  const [showBirthYears, setShowBirthYears] = useState(true);
  const [collaborators, setCollaborators] = useState<TreeCollaborator[]>([]);

  useEffect(() => {
    if (persons.length > 0 && !egoId) {
      setEgoId(persons[0].id);
    }
  }, [persons, egoId]);

  useEffect(() => {
    if (egoId) {
      setAddressesReady(false);
    }
  }, [egoId]);

  useEffect(() => {
    let cancelled = false;

    if (!activeTreeId || !user?.userId || accessRole !== "OWNER") {
      setCollaborators([]);
      return;
    }

    getCollaborators(activeTreeId)
      .then((result) => {
        if (!cancelled) {
          setCollaborators(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCollaborators([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTreeId, user?.userId, accessRole]);

  const loadTree = useCallback(async (id: string, token?: string) => {
    setLoadingData(true);
    setAddressesReady(false);
    setError(null);
    try {
      const data = await api.get<{
        persons: Person[];
        relationships: Relationship[];
        region: Region;
        livingRedaction: boolean;
        sharing: string;
        name: string;
        accessRole: TreeAccessRole;
        capabilities: Capabilities;
      }>(`/trees/${encodeURIComponent(id)}`, {
        headers: token ? { "X-Share-Token": token } : undefined,
      });
      setPersons(data.persons);
      setRelationships(data.relationships);
      setRegionState(data.region);
      setLivingRedaction(data.livingRedaction);
      setSharing(data.sharing);
      setTreeName(data.name || "Cây Gia Phả");
      setAccessRole(data.accessRole);
      setCapabilities(data.capabilities);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          setAuthError(true);
        }
        if (err.status === 401) {
          // Sometimes 401 can immediately redirect
          router.push(`/signin?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
          return;
        }
        setError(err.message);
      } else {
        setError("Không thể tải sơ đồ gia phả. Vui lòng thử lại.");
      }
    } finally {
      setLoadingData(false);
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get(
        "shareToken",
      );
      if (fromHash) {
        setShareToken(fromHash);
      }
    }
  }, []);

  useEffect(() => {
    if (activeTreeId) {
      loadTree(activeTreeId, shareToken || undefined);
    } else if (!sessionLoading) {
      setLoadingData(false);
    }
  }, [activeTreeId, shareToken, sessionLoading, loadTree]);

  useEffect(() => {
    if (authError && !sessionLoading && !user) {
      const redirectPath = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/signin?redirect=${redirectPath}`);
    }
  }, [authError, sessionLoading, user, router]);

  const refreshTree = useCallback(() => {
    if (activeTreeId) {
      loadTree(activeTreeId, shareToken || undefined);
    }
  }, [activeTreeId, shareToken, loadTree]);

  const handleAddressesLoaded = useCallback((loaded: Map<string, Address>) => {
    setAddresses(loaded);
    setAddressesReady(true);
  }, []);

  const isOwner = accessRole === "OWNER";
  const isCollaborator = accessRole === "CONTRIBUTOR";
  const canEdit = capabilities.editContent;
  const guidanceRole = isOwner ? "owner" : canEdit ? "editor" : "reader";

  const isSessionOrDataLoading = sessionLoading || (loadingData && persons.length === 0);
  const showLoadingOverlay = isSessionOrDataLoading || (persons.length > 0 && !addressesReady);

  return {
    activeTreeId,
    shareToken,
    persons,
    relationships,
    addresses,
    collaborators,
    treeName,
    region,
    livingRedaction,
    sharing,
    showBirthYears,
    loadingData,
    addressesReady,
    addressLoading,
    error,
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
    accessRole,
    capabilities,
    isOwner,
    isCollaborator,
    canEdit,
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
    isSessionOrDataLoading,
    showLoadingOverlay,
  };
}
