import { useState, useEffect, useRef } from "react";
import { type Address, type Person, type Relationship, fetchViewpointAddresses, indexAddresses } from "@/lib/graph";

export interface UseViewpointAddressesInput {
  treeId: string;
  egoId: string;
  persons: Person[];
  relationships: Relationship[];
  refreshKey: number;
  fetchAddresses?: typeof fetchViewpointAddresses;
}

export interface UseViewpointAddressesResult {
  addresses: Map<string, Address>;
  loading: boolean;
  ready: boolean;
  error: string | null;
}

export function useViewpointAddresses({
  treeId,
  egoId,
  persons,
  relationships,
  refreshKey,
  fetchAddresses = fetchViewpointAddresses
}: UseViewpointAddressesInput): UseViewpointAddressesResult {
  const [addresses, setAddresses] = useState<Map<string, Address>>(new Map());
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestRef = useRef(0);

  const structureRef = useRef({ persons, relationships, egoId });
  useEffect(() => {
    if (
      structureRef.current.persons !== persons ||
      structureRef.current.relationships !== relationships ||
      structureRef.current.egoId !== egoId
    ) {
      setReady(false);
      structureRef.current = { persons, relationships, egoId };
    }
  }, [persons, relationships, egoId]);

  useEffect(() => {
    if (!egoId) {
      requestRef.current++;
      setAddresses(new Map());
      setReady(true);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestRef.current;
    const controller = new AbortController();
    setAddresses(new Map());
    setReady(false);
    setLoading(true);
    setError(null);

    fetchAddresses(treeId, egoId, controller.signal)
      .then((result) => {
        if (requestId !== requestRef.current) return;
        setAddresses(indexAddresses(result));
        setReady(true);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (requestId !== requestRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAddresses(new Map());
        setReady(true);
        setError("Không tải được cách xưng hô theo người đang xét.");
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [treeId, egoId, refreshKey, fetchAddresses, persons, relationships]);

  return { addresses, loading, ready, error };
}
