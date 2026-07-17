import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/providers";
import { api, ApiError } from "@/lib/apiClient";
import type { Person, Relationship, Address, Capabilities, TreeAccessRole } from "@/lib/graph";
import type { Region } from "@/lib/region";
import { getCollaborators, type TreeCollaborator } from "@/lib/collaboration";
import type { TreeContextType } from "./TreeContext";
import { useViewpointAddresses } from "./useViewpointAddresses";
import { normalizeTreeDetailPayload } from "./treeDetailPayload";

const NO_CAPABILITIES: Capabilities = {
  editContent: false,
  editRelationships: false,
  editPhotos: false,
  editVisibility: false,
  manageClaim: false,
  manageTree: false,
  manageCollaboration: false,
};

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
  const [capabilities, setCapabilities] = useState<Capabilities>(NO_CAPABILITIES);
  const loadRequestId = useRef(0);

  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [addRelativeMode, setAddRelativeMode] = useState(false);
  const [createMode, setCreateMode] = useState(false);

  const [egoId, setEgoId] = useState<string>("");
  const [addressRefreshKey, setAddressRefreshKey] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);

  const { addresses, loading: addressLoading, ready: addressesReady, error: addressError } = useViewpointAddresses({
    treeId: activeTreeId,
    egoId,
    persons,
    relationships,
    refreshKey: addressRefreshKey
  });

  const selectedAddress = selectedId ? addresses.get(selectedId) : undefined;
  const selectedEgo = egoId ? persons.find((p) => p.id === egoId) || null : null;

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
    let cancelled = false;

    if (!activeTreeId || !user?.userId || !capabilities.manageCollaboration) {
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
  }, [activeTreeId, user?.userId, capabilities.manageCollaboration]);

  const loadTree = useCallback(async (id: string, token?: string) => {
    const requestId = ++loadRequestId.current;
    setLoadingData(true);
    setError(null);
    setAuthError(false);
    setAccessRole("NONE");
    setCapabilities(NO_CAPABILITIES);
    setCollaborators([]);
    try {
      const data = normalizeTreeDetailPayload(
        await api.get<unknown>(`/trees/${encodeURIComponent(id)}`, {
          headers: token ? { "X-Share-Token": token } : undefined,
        }),
      );
      if (requestId !== loadRequestId.current) {
        return;
      }
      setPersons(data.persons);
      setRelationships(data.relationships);
      setRegionState(data.region);
      setLivingRedaction(data.livingRedaction);
      setSharing(data.sharing);
      setTreeName(data.name || "Cây Gia Phả");
      setAccessRole(data.accessRole);
      setCapabilities(data.capabilities);
    } catch (err) {
      if (requestId !== loadRequestId.current) {
        return;
      }
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
      if (requestId === loadRequestId.current) {
        setLoadingData(false);
      }
    }
  }, [router]);

  useEffect(() => () => {
    loadRequestId.current += 1;
  }, []);

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

  const isOwner = capabilities.manageTree && capabilities.manageCollaboration;
  const isCollaborator = !isOwner && capabilities.editContent && capabilities.editRelationships;
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
    addressError,
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
    setFocusId,
    setEditMode,
    setAddRelativeMode,
    setCreateMode,
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
    isSessionOrDataLoading,
    showLoadingOverlay,
  };
}
