export type PersonPanelMode =
  | "view"
  | "edit"
  | "add-person"
  | "update-relationship";

export interface PersonPanelState {
  personId: string | null;
  mode: PersonPanelMode;
}

export type PersonPanelAction =
  | { type: "select"; personId: string }
  | {
      type: "open";
      personId: string;
      mode: Exclude<PersonPanelMode, "view">;
    }
  | { type: "back" }
  | { type: "close" }
  | { type: "created"; personId: string };

export const CLOSED_PERSON_PANEL_STATE: PersonPanelState = {
  personId: null,
  mode: "view",
};

export function personPanelReducer(
  state: PersonPanelState,
  action: PersonPanelAction,
): PersonPanelState {
  switch (action.type) {
    case "select":
      return { personId: action.personId, mode: "view" };
    case "open":
      return { personId: action.personId, mode: action.mode };
    case "back":
      return state.personId
        ? { personId: state.personId, mode: "view" }
        : CLOSED_PERSON_PANEL_STATE;
    case "close":
      return CLOSED_PERSON_PANEL_STATE;
    case "created":
      return { personId: action.personId, mode: "view" };
  }
}
