"use client";

import { useCallback, useReducer, useRef } from "react";
import {
  CLOSED_PERSON_PANEL_STATE,
  personPanelReducer,
  type PersonPanelMode,
} from "./personPanelState";

export function usePersonPanelController() {
  const [personPanelState, dispatch] = useReducer(
    personPanelReducer,
    CLOSED_PERSON_PANEL_STATE,
  );
  const panelOpenerRef = useRef<HTMLElement | null>(null);
  const childOpenerRef = useRef<HTMLElement | null>(null);
  const childOpenerKeyRef = useRef<string | null>(null);

  const selectPerson = useCallback(
    (personId: string, opener?: HTMLElement | null) => {
      if (opener) panelOpenerRef.current = opener;
      dispatch({ type: "select", personId });
    },
    [],
  );

  const openPersonPanel = useCallback(
    (
      personId: string,
      mode: Exclude<PersonPanelMode, "view">,
      opener?: HTMLElement | null,
    ) => {
      if (opener) {
        childOpenerRef.current = opener;
        childOpenerKeyRef.current = opener.dataset.personPanelFocusKey ?? null;
        if (!personPanelState.personId) panelOpenerRef.current = opener;
      }
      dispatch({ type: "open", personId, mode });
    },
    [personPanelState.personId],
  );

  const backPersonPanel = useCallback(() => {
    const opener = childOpenerRef.current;
    const openerKey = childOpenerKeyRef.current;
    dispatch({ type: "back" });
    childOpenerRef.current = null;
    childOpenerKeyRef.current = null;

    if (opener?.isConnected) {
      opener.focus();
      return;
    }
    if (!openerKey) return;

    requestAnimationFrame(() => {
      const replacement = Array.from(
        document.querySelectorAll<HTMLElement>("[data-person-panel-focus-key]"),
      ).find((element) => element.dataset.personPanelFocusKey === openerKey);
      replacement?.focus();
    });
  }, []);

  const closePersonPanel = useCallback(() => {
    dispatch({ type: "close" });
    const opener = panelOpenerRef.current;
    childOpenerRef.current = null;
    childOpenerKeyRef.current = null;
    panelOpenerRef.current = null;
    opener?.focus();
  }, []);

  const showCreatedPerson = useCallback((personId: string) => {
    dispatch({ type: "created", personId });
    childOpenerRef.current = null;
    childOpenerKeyRef.current = null;
  }, []);

  return {
    personPanelState,
    personPanelMode: personPanelState.mode,
    selectedId: personPanelState.personId,
    selectPerson,
    openPersonPanel,
    backPersonPanel,
    closePersonPanel,
    showCreatedPerson,
  };
}
