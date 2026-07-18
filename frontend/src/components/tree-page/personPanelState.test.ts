import { describe, expect, it } from "vitest";
import {
  CLOSED_PERSON_PANEL_STATE,
  personPanelReducer,
} from "./personPanelState";

describe("personPanelReducer", () => {
  it("selects a person in view mode", () => {
    expect(
      personPanelReducer(CLOSED_PERSON_PANEL_STATE, {
        type: "select",
        personId: "person-1",
      }),
    ).toEqual({ personId: "person-1", mode: "view" });
  });

  it.each(["edit", "add-person", "update-relationship"] as const)(
    "opens %s without producing an incompatible state",
    (mode) => {
      expect(
        personPanelReducer(CLOSED_PERSON_PANEL_STATE, {
          type: "open",
          personId: "person-1",
          mode,
        }),
      ).toEqual({ personId: "person-1", mode });
    },
  );

  it("returns a child mode to the same person's view", () => {
    expect(
      personPanelReducer(
        { personId: "person-1", mode: "edit" },
        { type: "back" },
      ),
    ).toEqual({ personId: "person-1", mode: "view" });
  });

  it("keeps the closed state normalized when back is dispatched without a person", () => {
    expect(
      personPanelReducer(CLOSED_PERSON_PANEL_STATE, { type: "back" }),
    ).toEqual(CLOSED_PERSON_PANEL_STATE);
  });

  it("closes the panel from every mode", () => {
    expect(
      personPanelReducer(
        { personId: "person-1", mode: "update-relationship" },
        { type: "close" },
      ),
    ).toEqual(CLOSED_PERSON_PANEL_STATE);
  });

  it("opens the newly created person's information", () => {
    expect(
      personPanelReducer(
        { personId: "person-1", mode: "add-person" },
        { type: "created", personId: "person-2" },
      ),
    ).toEqual({ personId: "person-2", mode: "view" });
  });
});
