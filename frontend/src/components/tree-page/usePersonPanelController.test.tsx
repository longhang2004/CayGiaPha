import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePersonPanelController } from "./usePersonPanelController";

describe("usePersonPanelController", () => {
  it("restores focus to the remounted child action after Back", async () => {
    const childOpener = document.createElement("button");
    childOpener.dataset.personPanelFocusKey = "edit-person";
    const replacement = document.createElement("button");
    replacement.dataset.personPanelFocusKey = "edit-person";
    const focus = vi.spyOn(replacement, "focus");
    const { result } = renderHook(() => usePersonPanelController());

    act(() => result.current.selectPerson("person-1"));
    act(() =>
      result.current.openPersonPanel("person-1", "edit", childOpener),
    );
    document.body.append(replacement);
    act(() => result.current.backPersonPanel());

    expect(result.current.personPanelState).toEqual({
      personId: "person-1",
      mode: "view",
    });
    await waitFor(() => expect(focus).toHaveBeenCalledTimes(1));
    replacement.remove();
  });

  it("restores focus to the footer action when it opened a child mode directly", () => {
    const footerOpener = document.createElement("button");
    document.body.append(footerOpener);
    const focus = vi.spyOn(footerOpener, "focus");
    const { result } = renderHook(() => usePersonPanelController());

    act(() =>
      result.current.openPersonPanel("person-1", "add-person", footerOpener),
    );
    act(() => result.current.backPersonPanel());

    expect(result.current.personPanelState).toEqual({
      personId: "person-1",
      mode: "view",
    });
    expect(focus).toHaveBeenCalledTimes(1);
    footerOpener.remove();
  });

  it("restores focus to the panel opener after Close", () => {
    const panelOpener = document.createElement("button");
    const focus = vi.spyOn(panelOpener, "focus");
    const { result } = renderHook(() => usePersonPanelController());

    act(() => result.current.selectPerson("person-1", panelOpener));
    act(() => result.current.closePersonPanel());

    expect(result.current.personPanelState.personId).toBeNull();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it("shows the new person after a successful creation", () => {
    const { result } = renderHook(() => usePersonPanelController());

    act(() => result.current.openPersonPanel("person-1", "add-person"));
    act(() => result.current.showCreatedPerson("person-2"));

    expect(result.current.selectedId).toBe("person-2");
    expect(result.current.personPanelMode).toBe("view");
  });
});
